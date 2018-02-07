/**
 * Modbus client write multiple coils.
 * @module ModbusClientWriteMultipleCoils
 */
'use strict'

let stampit = require('stampit')
let Promise = require('bluebird')

module.exports = stampit()
  .init(function () {
    let init = function () {
      this.addResponseHandler(15, onResponse)
    }.bind(this)

    let onResponse = function (pdu, request) {
      this.log.debug('handling multiple coils response.')
      this.log.debug('on write multiple coils got PDU: ' + JSON.stringify(pdu) + ' pdu.length:' + pdu.length)
      this.log.debug('request: ' + JSON.stringify(request))

      if (pdu.length < 5) {
        request.defer.reject(new Error('PDU length less than five'))
        return
      }

      let fc = pdu.readUInt8(0)
      if (fc !== 15) {
        request.defer.reject(new Error('FC ' + fc + ' is not valid - FC15 is expected'))
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

    this.writeMultipleCoils = function (startAddress, coils, N) {
      return new Promise(function (resolve, reject) {
        let fc = 15
        let basePdu = Buffer.allocUnsafe(6)
        let pdu

        basePdu.writeUInt8(fc, 0)
        basePdu.writeUInt16BE(startAddress, 1)

        if (coils instanceof Buffer) {
          basePdu.writeUInt16BE(N, 3)
          basePdu.writeUInt8(coils.length, 5)
          pdu = Buffer.concat([basePdu, coils])
        } else if (coils instanceof Array) {
          if (coils.length > 1968) {
            reject()
            return
          }

          let byteCount = Math.ceil(coils.length / 8)
          let curByte = 0
          let curByteIdx = 0
          let cntr = 0
          let payloadPdu = Buffer.allocUnsafe(byteCount)

          basePdu.writeUInt16BE(coils.length, 3)
          basePdu.writeUInt8(byteCount, 5)

          for (let i = 0; i < coils.length; i += 1) {
            curByte += coils[i] ? Math.pow(2, cntr) : 0

            cntr = (cntr + 1) % 8

            if (cntr === 0 || i === coils.length - 1) {
              payloadPdu.writeUInt8(curByte, curByteIdx)
              curByteIdx = curByteIdx + 1
              curByte = 0
            }
          }

          pdu = Buffer.concat([basePdu, payloadPdu])
        }

        this.queueRequest(fc, pdu, { resolve: resolve, reject: reject })
      }.bind(this))
    }

    init()
  })
