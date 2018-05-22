/**
 * Modbus server core.
 * @module ModbusCoreServer
 */
'use strict'

var stampit = require('stampit')
var EventBus = require('stampit-event-bus')
var logger = require('stampit-log')

let core = stampit()
  .refs({
    'logLabel': 'ModbusCoreServer',
    'logLevel': 'info',
    'logEnabled': true
  })
  .compose(EventBus, logger)
  .init(function () {
    let coils
    let holding
    let input
    let handler = {}

    let init = function () {
      if (!this.coils) {
        coils = Buffer.alloc(1024, 0)
      } else {
        coils = this.coils
      }

      if (!this.holding) {
        holding = Buffer.alloc(1024, 0)
      } else {
        holding = this.holding
      }

      if (!this.input) {
        input = Buffer.alloc(1024, 0)
      } else {
        input = this.input
      }

      if (this.logLevel) {
        this.log.logLevel = this.logLevel
      }
      this.log.info('log level: ' + this.log.logLevel)
    }.bind(this)

    this.onData = function (pdu, callback) {
      this.log.debug('incoming data')

      let reqHandler, fc
      if (pdu.length && pdu.length > 0) {
        // get fc and byteCount in advance
        fc = pdu.readUInt8(0)
        // get the pdu handler
        reqHandler = handler[fc]
        if (!reqHandler) {
          // write a error/exception pkt to the
          // socket with error code fc + 0x80 and
          // exception code 0x01 (Illegal Function)
          this.log.debug('no handler for fc', fc)

          let buf = Buffer.alloc(2)
          buf.writeUInt8(fc + 0x80, 0)
          buf.writeUInt8(0x01, 1)

          callback(buf)
        } else {
          reqHandler(pdu, function (response) {
            callback(response)
          })
        }
      } else {
        this.log.debug('nothing to do - got an empty message without fc')
      }
    }.bind(this)

    this.setRequestHandler = function (fc, callback) {
      this.log.debug('setting request handler', fc)

      handler[fc] = callback

      return this
    }

    this.getCoils = function () {
      return coils
    }

    this.getInput = function () {
      return input
    }

    this.getHolding = function () {
      return holding
    }

    init()
  })

module.exports = core
