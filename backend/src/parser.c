#include "parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Helper to extract string values or simple arrays from raw JSON strings
int parse_seating_json(const char *json_str, SeatingProblem *problem, Arena *arena) {
    if (!json_str || !problem || !arena) return 0;

    // 1. Locate guest_count
    const char *gc_ptr = strstr(json_str, "guest_count");
    if (!gc_ptr) return 0;
    problem->guest_count = atoi(strchr(gc_ptr, ':') + 1);

    if (problem->guest_count <= 0 || problem->guest_count > 100) return 0;

    // 2. Allocate memory structures inside the Arena
    problem->guests = arena_alloc(arena, problem->guest_count * sizeof(char *));
    problem->guest_emails = arena_alloc(arena, problem->guest_count * sizeof(char *));
    problem->assigned_tables = arena_alloc(arena, problem->guest_count * sizeof(int));
    problem->matrix = arena_alloc(arena, problem->guest_count * sizeof(int *));

    for (int i = 0; i < problem->guest_count; i++) {
        problem->matrix[i] = arena_alloc(arena, problem->guest_count * sizeof(int));
        problem->guests[i] = arena_alloc(arena, 64);
        problem->guest_emails[i] = arena_alloc(arena, 64);
        
        // Default placeholders
        snprintf(problem->guests[i], 64, "Guest %d", i + 1);
        snprintf(problem->guest_emails[i], 64, "guest%d@example.com", i + 1);
        problem->assigned_tables[i] = i % 4;
    }

    // 3. Parse guest names array if present in JSON
    const char *names_ptr = strstr(json_str, "\"guests\"");
    if (names_ptr) {
        const char *curr = strchr(names_ptr, '[');
        for (int i = 0; i < problem->guest_count && curr; i++) {
            curr = strchr(curr, '\"');
            if (!curr) break;
            curr++;
            const char *end_quote = strchr(curr, '\"');
            if (!end_quote) break;
            
            size_t len = (size_t)(end_quote - curr);
            if (len > 63) len = 63;
            memcpy(problem->guests[i], curr, len);
            problem->guests[i][len] = '\0';
            
            curr = end_quote + 1;
        }
    }

    // 4. Parse guest emails array if present in JSON
    const char *emails_ptr = strstr(json_str, "\"guest_emails\"");
    if (emails_ptr) {
        const char *curr = strchr(emails_ptr, '[');
        for (int i = 0; i < problem->guest_count && curr; i++) {
            curr = strchr(curr, '\"');
            if (!curr) break;
            curr++;
            const char *end_quote = strchr(curr, '\"');
            if (!end_quote) break;
            
            size_t len = (size_t)(end_quote - curr);
            if (len > 63) len = 63;
            memcpy(problem->guest_emails[i], curr, len);
            problem->guest_emails[i][len] = '\0';
            
            curr = end_quote + 1;
        }
    }

    // 5. Parse relationship matrix
    const char *mat_ptr = strstr(json_str, "relationship_matrix");
    if (!mat_ptr) return 0;

    const char *curr = strchr(mat_ptr, '[');
    for (int i = 0; i < problem->guest_count && curr; i++) {
        curr = strchr(curr + 1, '[');
        if (!curr) break;
        for (int j = 0; j < problem->guest_count && curr; j++) {
            curr++;
            problem->matrix[i][j] = atoi(curr);
            curr = strchr(curr, ',');
        }
    }

    return 1;
}