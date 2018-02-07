/**
 * Modbus client write single coil.
 * @module ModbusClientWriteCoil
 */
'use strict'

let Stampit = require('stampit')
let Promise = require('bluebird')

module.exports = Stampit()
  .init(function () {
    let init = function () {
      this.addResponseHandler(5, onResponse)
    }.bind(this)

    let onResponse = function (pdu, request) {
      this.log.debug('handling write single coil response.')
      this.log.debug('on write single coil got PDU: ' + JSON.stringify(pdu) + ' pdu.length:' + pdu.length)
      this.log.debug('request: ' + JSON.stringify(request))

      if (pdu.length < 5) {
        request.defer.reject(new Error('PDU length less than five'))
        return
      }

      let fc = pdu.readUInt8(0)
      if (fc !== 5) {
        request.defer.reject(new Error('FC' + fc + ' is not valid - FC5 is expected'))
        return
      }

      let outputAddress = pdu.readUInt16BE(1)
      let outputValue = pdu.readUInt16BE(3)
      let resp = {
        fc: fc,
        outputAddress: outputAddress,
        outputValue: outputValue === 0x0000 ? false : outputValue === 0xFF00 ? true : undefined
      }

      request.defer.resolve(resp)
    }.bind(this)

    this.writeSingleCoil = function (address, value) {
      return new Promise(function (resolve, reject) {
        let fc = 5
        let payload = (value instanceof Buffer) ? (value.readUInt8(0) > 0) : value

        let pdu = Buffer.allocUnsafe(5)
        pdu.writeUInt8(fc, 0)
        pdu.writeUInt16BE(address, 1)
        pdu.writeUInt16BE(payload ? 0xff00 : 0x0000, 3)

        this.queueRequest(fc, pdu, { resolve: resolve, reject: reject })
      }.bind(this))
    }

    init()
  })
