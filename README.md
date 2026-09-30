# kode-athletics

App de Kode Athletics: simulador de metcons, y metcons con marcas por usuario.

El login usa Supabase. Los metcons se guardan en las tablas de `supabase/schema.sql` (hay que ejecutarlo una vez en el editor SQL del proyecto). En Vercel, el `vercel.json` reenvía las rutas al `index.html`. Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` van en el proyecto de Vercel.
