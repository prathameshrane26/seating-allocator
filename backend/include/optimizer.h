#ifndef OPTIMIZER_H
#define OPTIMIZER_H

#include "arena.h"
#include "parser.h"

/**
 * @brief Phase 1: Graph Coloring Initial Allocation
 * Models guests as graph vertices and rivalries as edges to assign initial table buckets,
 * guaranteeing a valid baseline layout before fine-tuning.
 */
void graph_coloring_initial_allocation(Arena *arena, SeatingProblem *problem);

/**
 * @brief Phase 2: Simulated Annealing Optimization Core
 * Iteratively swaps guests across declining temperature steps to maximize harmony 
 * and escape local optima using probabilistic acceptance[cite: 5].
 */
void run_simulated_annealing(Arena *arena, SeatingProblem *problem, double initial_temp, double cooling_rate, int iterations);

/**
 * @brief Objective Harmony Scoring Function
 * Evaluates seating quality by summing affinity weights (+W for friends together) 
 * and penalizing rivalry weights (-W for rivals together)[cite: 5].
 */
double evaluate_harmony_score(const SeatingProblem *problem);

#endif // OPTIMIZER_H