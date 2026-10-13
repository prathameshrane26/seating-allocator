#include "arena.h"
#include <stdlib.h>
#include <string.h>

int arena_init(Arena *arena, size_t capacity) {
    if (!arena || capacity == 0) return 0;
    arena->buffer = (char *)malloc(capacity);
    if (!arena->buffer) return 0;
    arena->capacity = capacity;
    arena->offset = 0;
    return 1;
}

void *arena_alloc(Arena *arena, size_t size) {
    if (!arena || !arena->buffer) return 0;
    
    // Align allocation size to 8 bytes for performance
    size_t aligned_size = (size + 7) & ~7;
    
    if (arena->offset + aligned_size > arena->capacity) {
        return NULL; // Out of arena memory
    }
    
    void *ptr = &arena->buffer[arena->offset];
    arena->offset += aligned_size;
    return ptr;
}

void arena_reset(Arena *arena) {
    if (arena) {
        arena->offset = 0;
    }
}

void arena_free(Arena *arena) {
    if (arena) {
        if (arena->buffer) {
            free(arena->buffer);
            arena->buffer = NULL;
        }
        arena->capacity = 0;
        arena->offset = 0;
    }
}