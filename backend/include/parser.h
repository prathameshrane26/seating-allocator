#ifndef PARSER_H
#define PARSER_H

#include "arena.h"

/**
 * @brief Represents the event seating problem state and constraints parsed from the client JSON payload.
 */
typedef struct {
    int guest_count;         // Total number of guests registered for the event
    char **guests;           // Array of guest names
    char **guest_emails;     // Array of guest email addresses for ticket dispatch
    int **matrix;            // N x N adjacency matrix quantifying guest affinity (+) and rivalry (-) weights
    int *assigned_tables;    // Resulting table bucket index assigned to each guest
} SeatingProblem;

/**
 * @brief Parses incoming JSON string payloads from the frontend and populates the SeatingProblem structure using arena memory.
 * @param json_str Raw HTTP request body containing the JSON payload
 * @param problem Pointer to the SeatingProblem struct to populate
 * @param arena Pointer to the active Memory Arena for zero-fragmentation allocation
 * @return int 1 on successful parsing, 0 on failure
 */
int parse_seating_json(const char *json_str, SeatingProblem *problem, Arena *arena);

#endif // PARSER_H