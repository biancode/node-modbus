/**
 * Modbus client core.
 * @module ModbusCoreClient
 */
'use strict'

var stampit = require('stampit')
var logger = require('stampit-log')
var StateMachine = require('stampit-state-machine')

let ExceptionMessage = {
  0x01: 'ILLEGAL FUNCTION',
  0x02: 'ILLEGAL DATA ADDRESS',
  0x03: 'ILLEGAL DATA VALUE',
  0x04: 'SLAVE DEVICE FAILURE',
  0x05: 'ACKNOWLEDGE',
  0x06: 'SLAVE DEVICE BUSY',
  0x08: 'MEMORY PARITY ERROR',
  0x0A: 'GATEWAY PATH UNAVAILABLE',
  0x0B: 'GATEWAY TARGET DEVICE FAILED TO RESPOND'
}

module.exports = stampit()
  .refs({
    'logLabel': 'ModbusCoreClient',
    'logLevel': 'info',
    'logEnabled': true
  })
  .compose(StateMachine)
  .compose(logger)
  .init(function () {
    let responseHandler = {}
    let currentRequest = null

    this.reqFifo = []

    let init = function () {
      if (!this.timeout) {
        this.timeout = 2000 // ms
      }

      if (!this.endianType) {
        this.endianType = 'LITTLE'
      }

      if (this.logLevel) {
        this.log.logLevel = this.logLevel
      }
      this.log.info('log level: ' + this.log.logLevel)

      this.on('data', onData)
      this.on('timeout', onTimeout)
      this.on('newState_closed', onClosed)
    }.bind(this)

    let flush = function () {
      if (this.reqFifo.length === 0) {
        this.log.debug('Nothing in request pipe.')
        return
      } else {
        this.log.debug(this.reqFifo.length + ' requests in request pipe.')
      }

      currentRequest = this.reqFifo.shift()

      if (currentRequest && currentRequest.pdu) {
        this.setState('waiting')
        this.emit('send', currentRequest.pdu, setRequestTimeout)
        this.log.debug('Data flushed.')
      }
    }.bind(this)

    let setRequestTimeout = function () {
      currentRequest.timeout = setTimeout(function () {
        currentRequest.defer.reject({err: 'timeout'})
        this.emit('trashCurrentRequest')
        this.log.error('Request timed out after ' + this.timeout / 1000 + ' sec')
        this.emit('timeout')
      }.bind(this), this.timeout)
      this.log.debug('set timeout of ' + this.timeout + ' ms on send to wait for data')
    }.bind(this)

    let onTimeout = function () {
      // TODO: may here is something to be done
      this.setState('ready')
    }.bind(this)

    let onClosed = function () {
      if (currentRequest) {
        this.log.debug('Clearing timeout of the current request.')
        clearTimeout(currentRequest.timeout)
      }
      this.log.debug('Cleaning up request fifo.')
      while (this.reqFifo.length) {
        this.reqFifo.shift().defer.reject({err: 'Fifo cleanup'})
      }
    }.bind(this)

    let handleErrorPDU = function (pdu) {
      let errorCode = pdu.readUInt8(0)

      // if error code is smaller than 0x80
      // ths pdu describes no error

      if (errorCode < 0x80) {
        return false
      }

      // pdu describes an error
      if (pdu.length < 2) {
        currentRequest.defer.reject('PDU length ' + pdu.length + ' invalid')
        return true
      }

      let exceptionCode = pdu.readUInt8(1)
      let message = ExceptionMessage[exceptionCode]

      let err = {
        errorCode: errorCode,
        exceptionCode: exceptionCode,
        message: message
      }

      // call the desired deferred
      currentRequest.defer.reject(err)

      return true
    }

    /**
     *  Handle the incoming data, cut out the mbap
     *  packet and send the pdu to the listener
     */
    let onData = function (pdu) {
      if (!currentRequest) {
        this.log.debug('No current request.')
        return
      }
      clearTimeout(currentRequest.timeout)
      this.log.debug('received data and clean timeout PDU: ' + JSON.stringify(pdu))

      // check pdu for error
      if (handleErrorPDU(pdu)) {
        this.log.debug('Received pdu describes an error.')
        currentRequest = null
        this.setState('ready')
        return
      }

      // handle pdu
      let handler = responseHandler[currentRequest.fc]
      if (!handler) {
        this.log.debug('Found not handler for fc', currentRequest.fc)
        throw new Error('No handler implemented for fc ' + currentRequest.fc)
      }
      // TODO: here is may a problem - if we set here error it stay on error, but it should become ready again later

      handler(pdu, currentRequest)
      this.setState('ready')
    }.bind(this)

    this.addResponseHandler = function (fc, handler) {
      responseHandler[fc] = handler
      return this
    }.bind(this)

    this.queueRequest = function (fc, pdu, defer) {
      let req = {
        fc: fc,
        defer: defer,
        pdu: pdu
      }

      if (this.inState('ready')) {
        /* fill reqFifo just in ready state
         - think about running machines
         - recorded data sending later and very fast - because it is in queue - can damage machines
         */
        this.reqFifo.push(req)
        flush()
      } else {
        this.log.warn('not ready to transport data state:' + this.getState())
        if (this.inState('closed')) {
          this.emit('error', 'connection closed')
        }
        defer.reject({err: 'modbus client not in "ready" state'})
      }
    }

    init()
  })
