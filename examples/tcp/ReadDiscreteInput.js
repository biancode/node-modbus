'use strict'

var modbus = require('../../')
var client = modbus.client.tcp.complete({
  'host': process.argv[2],
  'port': process.argv[3],
  'logEnabled': true,
  'logLevel': 'debug',
  'logTimestamp': true
})

client.on('connect', function () {
  client.readDiscreteInputs(0, 12).then(function (resp) {
    console.log(resp)
  }).catch(function (err) {
    console.log(err)
  }).done(function () {
    client.close()
  })
})

client.on('error', function (err) {
  console.log(err)
})

client.connect()
