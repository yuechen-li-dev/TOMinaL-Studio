import { useCallback } from 'react';

import type { AppCommandDispatcher } from '@/app/session/appSession';
import type { MaterialCatalogData } from '@/catalog/catalogData';
import { MaterialCatalogView } from './MaterialCatalogView';

export default function CatalogWorkspace({ catalog, dispatch }: { catalog: MaterialCatalogData; dispatch: AppCommandDispatcher }) {
  const replaceCatalog = useCallback((catalog: MaterialCatalogData) => dispatch({ type: 'catalog.replace', catalog }), [dispatch]);
  return <div className="catalog-workspace h-full overflow-hidden bg-slate-950 text-foreground"><MaterialCatalogView catalog={catalog} onCatalogChange={replaceCatalog} /></div>;
}
