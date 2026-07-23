const net = require('net');

// Can we open a TCP connection to this host:port? Used both by the PACS
// connection test in Settings and by the server status check, which is why it
// lives here rather than inside either one.
function tcpCheck(host, port, timeoutMs = 3000) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let done = false;
    function finish(ok, message) {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch (e) {}
      resolve({ ok, host, port, message });
    }
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true, 'TCP connection succeeded'));
    socket.once('timeout', () => finish(false, 'Connection timed out'));
    socket.once('error', err => finish(false, err.message));
    socket.connect(port, host);
  });
}

module.exports = { tcpCheck };
