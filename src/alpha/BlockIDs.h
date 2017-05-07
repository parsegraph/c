#ifndef alpha_BlockIDs_INCLUDED
#define alpha_BlockIDs_INCLUDED
#include <apr_pools.h>
#include "BlockStuff.h"
extern float alpha_cubeStructure[];
float* alpha_BuildCubeStructure(apr_pool_t* pool);
float* alpha_BuildSlabStructure(apr_pool_t* pool);
void alpha_standardBlockTypes(apr_pool_t* pool, alpha_BlockTypes* BlockTypes);
#endif // alpha_BlockIDs_INCLUDED
