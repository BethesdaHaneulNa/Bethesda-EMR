// Test drugs for the pharmacy test scripts (isolated session stacks only).
//
// The scripts used the example drugs from the seed (ZINC, PCM500, …). Those are to be
// hidden when the clinic's real drug list is imported, so the tests make their own:
// one drug per name, code "TST-<name>", created through the settings API if missing
// and counted to `start` on the shelf so every run begins from a known stock.
// Returns { <name>: drug row } with the same names the scripts already use.
export async function ensureTestDrugs(call, adminToken, names, start = 500) {
  const out = {};
  for (const name of names) {
    const code = 'TST-' + name;
    let d = (await call('GET', '/admin/drugs?q=' + encodeURIComponent(code), null, adminToken)).data
      .find(x => x.code === code);
    if (!d) {
      const r = await call('POST', '/admin/drugs', {
        code, name: 'Test ' + name, category: 'Other',
        default_dose: '1', default_freq: 1, default_days: 1, default_route: 'QD',
        unit_price: 100, min_stock: 0,
      }, adminToken);
      if (r.status >= 300) throw new Error('could not create test drug ' + code + ': ' + JSON.stringify(r.data));
      d = r.data;
    }
    const c = await call('POST', '/pharmacy/stock/' + d.id + '/count', { counted: start, memo: 'test run start' }, adminToken);
    if (c.status !== 200) throw new Error('could not count test drug ' + code + ': ' + JSON.stringify(c.data));
    out[name] = Object.assign({}, d, { stock_qty: start });
  }
  return out;
}
