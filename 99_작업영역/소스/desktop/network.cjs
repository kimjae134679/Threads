'use strict';
const { BlockList, isIP } = require('node:net');
const blocked = new BlockList();
for (const [network, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['192.0.0.0', 24], ['192.0.2.0', 24], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]]) blocked.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [['::', 96], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['2002::', 16], ['64:ff9b::', 96]]) blocked.addSubnet(network, prefix, 'ipv6');
function publicAddress(address) {
  const version = isIP(address);
  if (!version) return false;
  return !blocked.check(address, version === 4 ? 'ipv4' : 'ipv6');
}
module.exports = { publicAddress };
