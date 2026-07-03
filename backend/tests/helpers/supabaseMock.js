// Piccolo doppio di test per il query builder di @supabase/supabase-js.
// Ogni metodo di query (select/eq/order/...) ritorna il builder stesso
// (chainable). Il builder è "thenable": ogni await (diretto sul builder,
// oppure dopo .single()/.maybeSingle()) consuma un risultato dalla coda
// configurata con __queueResult(...), in ordine FIFO. Se la coda è vuota
// ritorna un risultato neutro { data: null, error: null }.
function createQueryBuilder() {
  let queue = [];
  const builder = {};
  const chainMethods = ['select', 'eq', 'order', 'insert', 'update', 'delete', 'upsert', 'limit'];
  chainMethods.forEach((name) => {
    builder[name] = jest.fn(() => builder);
  });

  const resolveNext = () => Promise.resolve(queue.length ? queue.shift() : { data: null, error: null });

  builder.single = jest.fn(() => resolveNext());
  builder.maybeSingle = jest.fn(() => resolveNext());
  builder.then = (resolve, reject) => resolveNext().then(resolve, reject);
  builder.__queueResult = (result) => { queue.push(result); return builder; };
  builder.__reset = () => { queue = []; };

  return builder;
}

// dbClient.from(table) restituisce un builder diverso per ogni tabella, così
// ogni test configura in modo indipendente cosa deve rispondere ciascuna
// tabella tramite mockDb.table('products').__queueResult({ data, error }).
function createDbClientMock() {
  const builders = {};
  const getBuilder = (table) => {
    if (!builders[table]) builders[table] = createQueryBuilder();
    return builders[table];
  };
  const from = jest.fn((table) => getBuilder(table));
  return {
    from,
    table: getBuilder,
    resetAll: () => Object.values(builders).forEach((b) => b.__reset()),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/product-images/test.jpg' }
        }))
      }))
    }
  };
}

module.exports = { createQueryBuilder, createDbClientMock };
