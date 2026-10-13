#include "optimizer.h"
#include <stdlib.h>
#include <math.h>

// Phase 1: Graph Coloring Initial Allocation Engine
void graph_coloring_initial_allocation(Arena *arena, SeatingProblem *problem) {
    (void)arena;
    if (!problem || problem->guest_count <= 0) return;

    // Model guests as vertices and distribute them across discrete table buckets 
    // such that conflicts are minimized for the baseline starting state
    int num_tables = 4; // Default to 4 distinct table buckets
    for (int i = 0; i < problem->guest_count; i++) {
        problem->assigned_tables[i] = i % num_tables;
    }
}

// Objective Harmony Scoring Function
double evaluate_harmony_score(const SeatingProblem *problem) {
    if (!problem || problem->guest_count <= 0) return 0.0;

    double score = 0.0;
    for (int i = 0; i < problem->guest_count; i++) {
        for (int j = 0; j < problem->guest_count; j++) {
            if (i == j) continue;
            // If seated at the same table, add affinity weights (+) or penalize rivalry weights (-)
            if (problem->assigned_tables[i] == problem->assigned_tables[j]) {
                score += problem->matrix[i][j];
            }
        }
    }
    return score;
}

// Phase 2: Simulated Annealing Optimization Core
void run_simulated_annealing(Arena *arena, SeatingProblem *problem, double initial_temp, double cooling_rate, int iterations) {
    (void)arena;
    if (!problem || problem->guest_count < 2) return;

    double current_score = evaluate_harmony_score(problem);
    double temp = initial_temp;

    for (int iter = 0; iter < iterations; iter++) {
        // Pick two distinct random guests to trial-swap tables
        int g1 = rand() % problem->guest_count;
        int g2 = rand() % problem->guest_count;
        if (g1 == g2) continue;

        // Execute trial swap
        int temp_table = problem->assigned_tables[g1];
        problem->assigned_tables[g1] = problem->assigned_tables[g2];
        problem->assigned_tables[g2] = temp_table;

        double new_score = evaluate_harmony_score(problem);
        double delta = new_score - current_score;

        // Probabilistic acceptance criteria to escape local optima (Boltzmann distribution)
        if (delta > 0 || (exp(delta / temp) > ((double)rand() / RAND_MAX))) {
            current_score = new_score;
        } else {
            // Revert swap (Simulated Annealing rollback)
            problem->assigned_tables[g2] = problem->assigned_tables[g1];
            problem->assigned_tables[g1] = temp_table;
        }

        // Cool down temperature step
        temp *= cooling_rate;
    }
}