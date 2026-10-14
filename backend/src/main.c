#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "mongoose.h"
#include "arena.h"
#include "optimizer.h"
#include "parser.h"
#include <libpq-fe.h> // PostgreSQL C client library

#define CONNECTION_STRING "postgresql://neondb_owner:npg_abfZCqhU46zW@ep-broad-frog-b5g43d4p-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

#define ARENA_SIZE (1024 * 1024 * 16) // 16 MB pre-allocated arena memory

// Global arena instance for the server lifecycle
static Arena global_arena;

// Helper to safely read and serve static files from disk using standard C I/O
static void serve_static_file(struct mg_connection *c, struct mg_http_message *hm, const char *filepath, const char *content_type) {
    FILE *f = fopen(filepath, "rb");
    if (!f) {
        mg_http_reply(c, 404, "Content-Type: text/plain\r\n", "404 Not Found");
        return;
    }
    fseek(f, 0, SEEK_END);
    long length = ftell(f);
    fseek(f, 0, SEEK_SET);

    char *buf = malloc(length);
    if (!buf) {
        fclose(f);
        mg_http_reply(c, 500, "Content-Type: text/plain\r\n", "500 Internal Server Error");
        return;
    }
    fread(buf, 1, length, f);
    fclose(f);

    mg_http_reply(c, 200, content_type, "%.*s", (int)length, buf);
    free(buf);
}

// Event handler for incoming HTTP requests and static asset serving
static void http_event_handler(struct mg_connection *c, int ev, void *ev_data) {
    if (ev == MG_EV_HTTP_MSG) {
        struct mg_http_message *hm = (struct mg_http_message *) ev_data;

        // Route: POST /api/solve (Triggers Graph Coloring & Simulated Annealing)
        if (mg_match(hm->uri, mg_str("/api/solve"), NULL)) {
            arena_reset(&global_arena);

            SeatingProblem problem;
            if (!parse_seating_json(hm->body.buf, &problem, &global_arena)) {
                mg_http_reply(c, 400, "Content-Type: application/json\r\n", 
                              "{\"error\": \"Invalid JSON payload or out of memory\"}\n");
                return;
            }

            graph_coloring_initial_allocation(&global_arena, &problem);
            run_simulated_annealing(&global_arena, &problem, 100.0, 0.99, 1000);
            double final_score = evaluate_harmony_score(&problem);

            // Construct JSON response containing harmony score and table assignments
            char response_buf[2048];
            int offset = snprintf(response_buf, sizeof(response_buf), 
                "{\"status\": \"success\", \"harmony_score\": %f, \"assignments\": [", final_score);
            
            for (int i = 0; i < problem.guest_count; i++) {
                offset += snprintf(response_buf + offset, sizeof(response_buf) - offset, 
                    "%d%s", problem.assigned_tables[i], (i < problem.guest_count - 1) ? ", " : "");
            }
            snprintf(response_buf + offset, sizeof(response_buf) - offset, "]}\n");

            mg_http_reply(c, 200, "Content-Type: application/json\r\n", "%s", response_buf);
        }
        // Route: POST /api/evaluate (Live re-scoring for manual user overrides)
        else if (mg_match(hm->uri, mg_str("/api/evaluate"), NULL)) {
            arena_reset(&global_arena);

            SeatingProblem problem;
            if (!parse_seating_json(hm->body.buf, &problem, &global_arena)) {
                mg_http_reply(c, 400, "Content-Type: application/json\r\n", 
                              "{\"error\": \"Invalid JSON payload\"}\n");
                return;
            }

            double current_score = evaluate_harmony_score(&problem);

            mg_http_reply(c, 200, "Content-Type: application/json\r\n", 
                          "{\"status\": \"success\", \"current_score\": %f}\n", current_score);
        }
        // Fallback: Manually route browser requests to frontend files dynamically
        else {
            if (mg_match(hm->uri, mg_str("/"), NULL) || mg_match(hm->uri, mg_str("/index.html"), NULL)) {
                serve_static_file(c, hm, "frontend/index.html", "Content-Type: text/html\r\n");
            } 
            else if (strncmp(hm->uri.buf, "/css/", 5) == 0) {
                char filepath[256];
                snprintf(filepath, sizeof(filepath), "frontend%.*s", (int)hm->uri.len, hm->uri.buf);
                serve_static_file(c, hm, filepath, "Content-Type: text/css\r\n");
            } 
            else if (strncmp(hm->uri.buf, "/js/", 4) == 0) {
                char filepath[256];
                snprintf(filepath, sizeof(filepath), "frontend%.*s", (int)hm->uri.len, hm->uri.buf);
                serve_static_file(c, hm, filepath, "Content-Type: application/javascript\r\n");
            } 
            else {
                mg_http_reply(c, 404, "Content-Type: text/plain\r\n", "404 Not Found");
            }
        }
    }
}

int main(void) {
    if (!arena_init(&global_arena, ARENA_SIZE)) {
        fprintf(stderr, "Failed to initialize memory arena of size %d bytes\n", ARENA_SIZE);
        return 1;
    }
    printf("Memory arena initialized successfully (%d MB).\n", ARENA_SIZE / (1024 * 1024));

    struct mg_mgr mgr;
    mg_mgr_init(&mgr);

    const char *listening_address = "http://0.0.0.0:8000";
    if (!mg_http_listen(&mgr, listening_address, http_event_handler, NULL)) {
        fprintf(stderr, "Failed to start Mongoose HTTP server on %s\n", listening_address);
        arena_free(&global_arena);
        return 1;
    }

    printf("Event Venue Seating Allocator Backend running at http://localhost:8000\n");

    for (;;) {
        mg_mgr_poll(&mgr, 1000);
    }

    mg_mgr_free(&mgr);
    arena_free(&global_arena);
    return 0;
}


PGconn *init_db() {
    PGconn *conn = PQconnectdb(CONNECTION_STRING);
    if (PQstatus(conn) != CONNECTION_OK) {
        fprintf(stderr, "Neon DB Connection Failed: %s\n", PQerrorMessage(conn));
        PQfinish(conn);
        exit(1);
    }
    printf("Successfully connected to Neon PostgreSQL Cloud DB!\n");
    return conn;
}

// Example User Registration Handler endpoint function
void handle_register(PGconn *conn, const char *username, const char *password) {
    const char *paramValues[2] = { username, password };
    PGresult *res = PQexecParams(conn,
        "INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING;",
        2, NULL, paramValues, NULL, NULL, 0);
    
    PQclear(res);
}

// Example Guest Insert matching to_name and to_email
void handle_add_guest(PGconn *conn, int user_id, const char *to_name, const char *to_email, const char *table_number) {
    const char *paramValues[4];
    char user_id_str[20];
    sprintf(user_id_str, "%d", user_id);

    paramValues[0] = user_id_str;
    paramValues[1] = to_name;
    paramValues[2] = to_email;
    paramValues[3] = table_number;

    PGresult *res = PQexecParams(conn,
        "INSERT INTO guests (user_id, to_name, to_email, table_number) VALUES ($1, $2, $3, $4);",
        4, NULL, paramValues, NULL, NULL, 0);
    
    PQclear(res);
}