#ifndef alpha_GLWidget_INCLUDED
#define alpha_GLWidget_INCLUDED

#include <apr_pools.h>

struct alpha_GLWidget {
};
typedef struct alpha_GLWidget alpha_GLWidget;

alpha_GLWidget* alpha_GLWidget_new(apr_pool_t* pool);
void alpha_GLWidget_destroy(alpha_GLWidget* widget);

#endif // alpha_GLWidget_INCLUDED
