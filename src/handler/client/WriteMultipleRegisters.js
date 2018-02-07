/**
 * Modbus client write multiple registers.
 * @module ModbusClientWriteRegisters
 */
'use strict'

let stampit = require('stampit')
let Promise = require('bluebird')

module.exports = stampit()
  .init(function () {
    let init = function () {
      this.addResponseHandler(16, onResponse)
    }.bind(this)

    let onResponse = function (pdu, request) {
      this.log.debug('handling multiple registers response.')
      this.log.debug('on write multiple registers got PDU: ' + JSON.stringify(pdu) + ' pdu.length:' + pdu.length)
      this.log.debug('request: ' + JSON.stringify(request))

      if (pdu.length < 5) {
        request.defer.reject(new Error('PDU length less than five'))
        return
      }

      let fc = pdu.readUInt8(0)
      if (fc !== 16) {
        request.defer.reject(new Error('FC ' + fc + ' is not valid - FC16 is expected'))
        return
      }

      let startAddress = pdu.readUInt16BE(1)
      let quantity = pdu.readUInt16BE(3)
      let resp = {
        fc: fc,
        startAddress: startAddress,
        quantity: quantity
      }

      request.defer.resolve(resp)
    }.bind(this)

    this.writeMultipleRegisters = function (startAddress, register) {
      return new Promise(function (resolve, reject) {
        let fc = 16
        let basePdu = Buffer.allocUnsafe(6)
        let pdu

        basePdu.writeUInt8(fc)
        basePdu.writeUInt16BE(startAddress, 1)

        if (register instanceof Buffer) {
          if (register.length / 2 > 0x007b) {
            reject()
          }

          basePdu.writeUInt16BE(register.length / 2, 3)
          basePdu.writeUInt8(register.length, 5)

          pdu = Buffer.concat([basePdu, register])
        } else if (register instanceof Array) {
          if (register.length > 0x007b) {
            reject()
            return
          }

          let byteCount = Math.ceil(register.length * 2)
          let payloadPdu = Buffer.allocUnsafe(byteCount)

          basePdu.writeUInt16BE(register.length, 3)
          basePdu.writeUInt8(byteCount, 5)

          for (let i = 0; i < register.length; i += 1) {
            payloadPdu.writeUInt16BE(register[i], 2 * i)
          }

          pdu = Buffer.concat([basePdu, payloadPdu])
        } else {
          reject()
          return
        }

        this.queueRequest(fc, pdu, { resolve: resolve, reject: reject })
      }.bind(this))
    }

    init()
  })
