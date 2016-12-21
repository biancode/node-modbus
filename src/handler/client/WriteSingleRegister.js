/**
 * Modbus client write single register.
 * @module ModbusClientWriteRegister
 */
'use strict'

let Stampit = require('stampit')
let Promise = require('bluebird')

module.exports = Stampit()
  .init(function () {
    let init = function () {
      this.addResponseHandler(6, onResponse)
    }.bind(this)

    let onResponse = function (pdu, request) {
      this.log.debug('handling write single register response.')
      this.log.debug('on write single register got PDU: ' + JSON.stringify(pdu) + ' pdu.length:' + pdu.length)
      this.log.debug('request: ' + JSON.stringify(request))

      if (pdu.length < 5) {
        request.defer.reject()
        return
      }

      let fc = pdu.readUInt8(0)
      if (fc !== 6) {
        request.defer.reject()
        return
      }

      let registerAddress = pdu.readUInt16BE(1)
      let registerValue = pdu.readUInt16BE(3)
      let resp = {
        fc: fc,
        registerAddress: registerAddress,
        registerValue: registerValue,
        registerAddressRaw: pdu.slice(1, 3),
        registerValueRaw: pdu.slice(3, 5)
      }
      request.defer.resolve(resp)
    }.bind(this)

    this.writeSingleRegister = function (address, value) {
      return new Promise(function (resolve, reject) {
        let fc = 6
        let payload = (value instanceof Buffer) ? value.readUInt16BE(0) : value
        let pdu = Buffer.allocUnsafe(5)

        pdu.writeUInt8(fc, 0)
        pdu.writeUInt16BE(address, 1)
        pdu.writeUInt16BE(payload, 3)

        this.queueRequest(fc, pdu, {resolve: resolve, reject: reject})
      }.bind(this))
    }

    init()
  })
