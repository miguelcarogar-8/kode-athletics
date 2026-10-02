# kode-athletics

App de Kode Athletics: simulador de WODs, y WODs con marcas por usuario.

El login usa Supabase. Los WODs se guardan en las tablas de `supabase/schema.sql` (hay que ejecutarlo una vez en el editor SQL del proyecto; si las tablas ya existen, basta el `alter table` final, el de `level_targets`). En Vercel, el `vercel.json` reenvía las rutas de la app al `index.html` y deja libre `/api`.

Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` van en el proyecto de Vercel. `GEMINI_API_KEY` también, solo en el servidor: es la clave gratuita de Google AI Studio y no debe llevar prefijo `VITE_`. En local va en `.env`.
