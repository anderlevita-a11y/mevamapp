# Setup do banco (Supabase) — ordem de execução

Este repositório acumulou vários scripts `.sql` soltos ao longo do tempo
(correções sucessivas de permissão, novas features adicionadas em arquivos
separados). Isso tornava impossível saber com certeza qual conjunto de
políticas de RLS estava realmente ativo no banco de produção — e foi a causa
raiz de pelo menos duas brechas de segurança já corrigidas (escrita pública
aberta em `announcements`/`ministry_notices`/`church_services`, e leitura
pública de CPF/WhatsApp em `congress_registrations`).

Este arquivo é o índice único: diz o que rodar, em que ordem, e o que é só
histórico.

## Projeto novo (do zero)

Rode nesta ordem, no **SQL Editor** do painel do Supabase:

1. **`supabase_complete_setup.sql`** — arquivo canônico. Cria toda a base:
   perfis, ministérios, escalas, avisos, financeiro, cantina, congressos,
   oração, visitantes, LGPD/consentimento, contagem de visitas,
   indisponibilidade, teste vocacional, configurações do app, mercado
   solidário, etc. Idempotente (pode rodar de novo sem erro).
2. **`church_services_schema.sql`** — tabela de cultos/programação (não
   está no arquivo canônico).
3. **`src/event_lists_schema.sql`** — listas de eventos, participantes e
   bucket de storage para comprovantes (não está no arquivo canônico).
4. **`weekly_repository_schema.sql`** — opcional, só para popular o
   conteúdo padrão do Repositório Semanal (as tabelas que ele cria já vêm
   do passo 1).
5. **`security_rls_fix.sql`** — SEMPRE rode por último. Concentra todas as
   correções de segurança (escalação de privilégio em `profiles.role`,
   políticas de escrita abertas, vazamento de PII em inscrições de
   congresso, etc.), independente de qual histórico o banco tem.

## Projeto já existente (produção atual)

Você não precisa rodar os passos 1–4 de novo (as tabelas já existem). Rode
só:

```
security_rls_fix.sql
```

Ele é idempotente — pode rodar quantas vezes for preciso. Depois, confira em
**Database → Advisors → Security** no painel do Supabase.

## Arquivos históricos / depreciados

Estes arquivos foram usados em algum momento da evolução do projeto, mas
suas tabelas **já estão** em `supabase_complete_setup.sql`. Cada um tem um
aviso `⚠️ HISTÓRICO / DEPRECIADO` no topo. **Não rode nenhum deles em um
projeto novo** — na melhor das hipóteses é redundante, na pior colide com o
arquivo canônico (`CREATE TABLE` sem `IF NOT EXISTS` em algumas tabelas):

- `supabase_setup.sql`
- `supabase_schema.sql`
- `privacy_policy_schema.sql`
- `announcements_fix.sql`
- `unavailability_schema.sql`
- `vocational_test_schema.sql`
- `events_schema.sql`
- `src/congress_schema.sql`

Eles foram mantidos (não apagados) só para preservar o histórico do
repositório, e cada um recebeu a mesma correção de RLS que os arquivos
ativos — mas o schema oficial vive em `supabase_complete_setup.sql`.

## SQL embutido na UI (`App.tsx`)

O painel do Pastor/Admin tem modais de "copiar SQL" (`church_services` e
`announcements`/`ministry_notices`) que geram um script para colar no SQL
Editor caso o admin note algum problema de permissão. Esses blocos já foram
corrigidos para não sugerir mais políticas abertas — mas se algum dia
precisar adicionar um novo, use o mesmo padrão de `security_rls_fix.sql`
(escrita restrita a `admin`/`pastor` via `auth.jwt() -> 'app_metadata' ->>
'role'`), nunca `USING (true) WITH CHECK (true)`.
