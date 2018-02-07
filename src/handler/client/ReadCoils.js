/**
 * Modbus client read.
 * @module ModbusClientReadCoils
 */
'use strict'

let Stampit = require('stampit')
let Promise = require('bluebird')

module.exports = Stampit()
  .init(function () {
    let init = function () {
      this.addResponseHandler(1, onResponse)
    }.bind(this)

    let onResponse = function (pdu, request) {
      this.log.debug('handling read coils response.')
      this.log.debug('on read coils got PDU: ' + JSON.stringify(pdu) + ' pdu.length:' + pdu.length)
      this.log.debug(' request: ' + JSON.stringify(request))

      if (pdu.length < 2) {
        request.defer.reject(new Error('PDU length less than two'))
        return
      }

      let fc = pdu.readUInt8(0)
      let byteCount = pdu.readUInt8(1)

      let resp = {
        fc: fc,
        byteCount: byteCount,
        payload: pdu.slice(2),
        coils: []
      }

      if (fc !== 1) {
        request.defer.reject(new Error('FC ' + fc + ' is not valid - FC1 is expected'))
        return
      }

      let cntr = 0
      let h = 1
      let cur = 0

      for (let i = 0; i < byteCount; i += 1) {
        h = 1
        cur = pdu.readUInt8(2 + i)

        for (let j = 0; j < 8; j += 1) {
          resp.coils[cntr] = (cur & h) > 0
          h = h << 1
          cntr += 1
        }
      }

      request.defer.resolve(resp)
    }.bind(this)

    /**
     * Reading coils with FC1.
     * @param start
     * @param quantity
     */
    this.readCoils = function (start, quantity) {
      return new Promise(function (resolve, reject) {
        let fc = 1
        let pdu = Buffer.allocUnsafe(5)

        pdu.writeUInt8(fc, 0)
        pdu.writeUInt16BE(start, 1)
        pdu.writeUInt16BE(quantity, 3)

        this.queueRequest(fc, pdu, { resolve: resolve, reject: reject })
      }.bind(this))
    }

    init()
  })
