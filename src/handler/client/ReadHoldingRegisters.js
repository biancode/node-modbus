/**
 * Modbus client read holding registers.
 * @module ModbusClientReadHoldingRegisters
 */
'use strict'

let Stampit = require('stampit')
let Promise = require('bluebird')

module.exports = Stampit()
  .init(function () {
    let init = function () {
      this.addResponseHandler(3, onResponse)
    }.bind(this)

    let onResponse = function (pdu, request) {
      this.log.debug('handling read holding registers response.')
      this.log.debug('on read holding registers got PDU: ' + JSON.stringify(pdu) + ' pdu.length:' + pdu.length)
      this.log.debug('request: ' + JSON.stringify(request))

      if (pdu.length < 2) {
        request.defer.reject(new Error('PDU length less than two'))
        return
      }

      let fc = pdu.readUInt8(0)
      if (fc !== 3) {
        request.defer.reject(new Error('FC ' + fc + ' is not valid - FC3 is expected'))
        return
      }

      let byteCount = pdu.readUInt8(1)
      let resp = {
        fc: fc,
        byteCount: byteCount,
        payload: pdu.slice(2),
        register: []
      }

      let registerCount = byteCount / 2

      for (let i = 0; i < registerCount; i += 1) {
        resp.register.push(pdu.readUInt16BE(2 + (i * 2)))
      }

      request.defer.resolve(resp)
    }.bind(this)

    this.readHoldingRegisters = function (start, quantity) {
      return new Promise(function (resolve, reject) {
        let fc = 3
        let pdu = Buffer.allocUnsafe(5)

        pdu.writeUInt8(fc)
        pdu.writeUInt16BE(start, 1)
        pdu.writeUInt16BE(quantity, 3)

        this.queueRequest(fc, pdu, { resolve: resolve, reject: reject })
      }.bind(this))
    }

    init()
  })
