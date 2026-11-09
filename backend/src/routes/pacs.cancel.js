// Cancelling an imaging order that already has a result (decision 3-B, PACS
// part). The consultation session's cancel endpoint calls this inside its own
// transaction when the order is an imaging one; it is here because the worklist
// is PACS's to keep consistent.
//
// Only an entry that is still waiting to be taken is cancelled. One that is
// 'completed' stays so: that row records that the study was taken, and the
// order's own status already says it was cancelled. A cancelled entry leaves
// the bridge feed (status = 'scheduled' only), so its .wl file is gone from the
// devices within one bridge cycle -- nothing in the bridge had to change.
//
// Switch this on for imaging only once the PACS repository is merged: before
// that the EMR never learns that images arrived, so a taken study still looks
// 'scheduled' and could be deleted instead of cancelled (handoff, 2026-09-29).

const ORDER_CANCELLED = 'Imaging order was cancelled';

async function cancelWorklistForOrder(client, orderItemId) {
  const r = await client.query(
    `UPDATE worklist_log SET status = 'cancelled'
      WHERE order_item_id = $1 AND status IN ('scheduled', 'in_progress')
      RETURNING id`, [orderItemId]);
  if (r.rows.length) {
    await client.query(
      `UPDATE order_item SET worklist_status = 'cancelled', updated_at = NOW() WHERE id = $1`, [orderItemId]);
  }
  return { worklist_cancelled: r.rows.length };
}

module.exports = { ORDER_CANCELLED, cancelWorklistForOrder };
