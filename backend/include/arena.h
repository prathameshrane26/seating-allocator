#ifndef ARENA_H
#define ARENA_H

#include <stddef.h>

/**
 * @brief Memory Arena structure for contiguous chunking and instant state rollback.
 * Eliminates runtime heap fragmentation and garbage collection overhead during optimization loops.
 */
typedef struct {
    char *buffer;      // Pointer to the pre-allocated memory chunk
    size_t capacity;   // Total allocated size in bytes
    size_t offset;     // Current allocation offset pointer (used for instant rollback)
} Arena;

/**
 * @brief Initializes the memory arena with a fixed capacity.
 * @param arena Pointer to the Arena struct
 * @param capacity Size in bytes to pre-allocate via malloc
 * @return int 1 on success, 0 on failure
 */
int arena_init(Arena *arena, size_t capacity);

/**
 * @brief Allocates a block of memory from the arena.
 * @param arena Pointer to the Arena struct
 * @param size Number of bytes to allocate
 * @return void* Pointer to the allocated memory block, or NULL if out of memory
 */
void *arena_alloc(Arena *arena, size_t size);

/**
 * @brief Resets the arena offset back to zero, effectively freeing all allocations instantly.
 * @param arena Pointer to the Arena struct
 */
void arena_reset(Arena *arena);

/**
 * @brief Frees the underlying memory buffer completely upon server shutdown.
 * @param arena Pointer to the Arena struct
 */
void arena_free(Arena *arena);

#endif // ARENA_H