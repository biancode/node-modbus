/**
 * Modbus Serial client.
 * @module ModbusSerialClient
 */
'use strict'

let stampit = require('stampit')
let ModbusCore = require('./modbus-client-core.js')

module.exports = stampit()
  .compose(ModbusCore)
  .refs({
    'logLabel': 'ModbusSerialClient'
  })
  .init(function () {
    let SerialPort = require('serialport')
    let crc = require('crc')
    let serialport
    let receiveBuffer = Buffer.alloc(256)
    let receivedBytes = 0
    let expectedBytes = 0
    let crcBytes = 2
    let minLength = 0x80
    let exeptionMessageLength = 5

    if (!this.connectionDelay) {
      if (process.platform === 'win32') {
        this.connectionDelay = 500 // ms
      } else {
        this.connectionDelay = 250 // ms
      }
    }

    let init = function () {
      this.setState('init')

      if (!this.connectionType) { this.connectionType = 'RTU' }
      if (!this.portName) { throw new Error('No portname.') }
      if (!this.baudRate) { this.baudRate = 9600 }
      if (!this.dataBits) { this.dataBits = 8 }
      if (!this.stopBits) { this.stopBits = 1 }
      if (!this.parity) { this.parity = 'none' }
      // TODO: flowControl - ['xon', 'xoff', 'xany', 'rtscts']
      // TODO: settings - ['brk', 'cts', 'dtr', 'dts', 'rts']

      if (this.injectedSerialport) {
        serialport = this.injectedSerialport
        this.log.debug('we are working on a mockup serialport')
      } else {
        setTimeout(openSerialPort, this.connectionDelay)
      }

      this.log.debug('set on send method')
      this.on('send', onSend)
    }.bind(this)

    let openSerialPort = function () {
      // some delay needed on windows systems serial reconnect
      if (this.connectionType === 'ASCII') {
        serialport = new SerialPort(this.portName, {
          baudRate: this.baudRate,
          parity: this.parity,
          dataBits: this.dataBits,
          stopBits: this.stopBits,
          parser: (this.endianType === 'BIG') ? SerialPort.parsers.byteDelimiter([13, 10]) : SerialPort.parsers.byteDelimiter([10, 13])
        })
      } else {
        serialport = new SerialPort(this.portName, {
          baudRate: this.baudRate,
          parity: this.parity,
          dataBits: this.dataBits,
          stopBits: this.stopBits
        })
      }

      this.log.debug('serialport settings: ' + JSON.stringify(serialport.options))
      serialport.on('open', onOpen)
      serialport.on('disconnect', onDisconnect)
      serialport.on('close', onClose)
      serialport.on('data', onData)
      serialport.on('error', onError)
    }.bind(this)

    let onOpen = function () {
      this.setState('ready')
    }.bind(this)

    let onDisconnect = function (err) {
      this.setState('disconnected')
      if (err) {
        this.emit('error', err)
      }
    }.bind(this)

    let onClose = function () {
      this.setState('closed')
    }.bind(this)

    let onData = function (pdu) {
      if (pdu.length !== 0) { // at least one byte has been received
        this.log.debug('received serial data ' + JSON.stringify(pdu))

        if ((pdu.length + receivedBytes) <= receiveBuffer.length) {
          if (receivedBytes === 0 && pdu && pdu[0] === 0) {
            this.log.debug('we got a broadcast from master')
            this.resetReceiveBuffer()
            return
          }

          pdu.copy(receiveBuffer, receivedBytes, 0)
          receivedBytes += pdu.length

          if (receivedBytes >= exeptionMessageLength) {
            if (receivedBytes === exeptionMessageLength) {
              if (receiveBuffer[1] >= minLength &&
                crc.crc16modbus(receiveBuffer.slice(0, receivedBytes)) === 0) {
                this.emit('data', receiveBuffer.slice(1, receivedBytes - crcBytes))
                this.resetReceiveBuffer()
              }
            } else {
              if (expectedBytes > 0) {
                if (receivedBytes === expectedBytes) {
                  if (crc.crc16modbus(receiveBuffer.slice(0, receivedBytes)) === 0) {
                    this.emit('data', receiveBuffer.slice(1, receivedBytes - crcBytes))
                    this.resetReceiveBuffer()
                  }
                } else {
                  this.log.debug('received bytes ' + expectedBytes + ' differ from expected bytes ' + receivedBytes)
                }
              } else {
                this.log.debug('none expected bytes: ' + expectedBytes)
                this.emit('data', pdu)
              }
            }
          } else {
            this.log.debug('received bytes to less to do more -> receivedBytes: ' + receivedBytes)
          }
        } else {
          this.log.debug('received bytes to less to do more -> receivedBytes: ' + receivedBytes)
        }
      } else {
        this.log.debug('received bytes to less to do more -> pdu.length is empty')
      }
    }.bind(this)

    this.resetReceiveBuffer = function () {
      receivedBytes = 0
      receiveBuffer = null
      receiveBuffer = Buffer.alloc(256)
    }

    let onError = function (err) {
      this.emit('error', err)
    }.bind(this)

    let onSend = function (pdu, setRequestTimeout) {
      this.log.debug('PDU data' + JSON.stringify(pdu))

      let base = Buffer.allocUnsafe(1)
      base.writeUInt8(1)
      let buf = Buffer.concat([base, pdu])

      let crcModbus = crc.crc16modbus(buf)
      let crcBufModbus = Buffer.allocUnsafe(2)
      crcBufModbus.writeUInt16LE(crcModbus, 0)
      this.log.debug('crcModbus: ' + JSON.stringify(crcModbus) + ' crcModbus Buffer:' + JSON.stringify(crcBufModbus))

      let bufWithCRC = Buffer.concat([buf, crcBufModbus])
      this.log.debug('Endian-Type: ' + this.endianType)
      this.log.debug('Buffer with CR16LE ' + this.connectionType + ' : ' + JSON.stringify(bufWithCRC))

      receivedBytes = 0

      switch (pdu[0]) { // check for the function code that is requested
        case 1:
        case 2:
          // expected response length is crc+adr+fc+len=5 + (number of coils/8)+1 to be requested
          expectedBytes = 5 + (Math.floor(pdu.readInt16BE(3) / 8)) + 1
          break

        case 3:
        case 4:
          // expected response length is crc+adr+fc+len=5 + number of bytes to be requested
          expectedBytes = 5 + pdu.readInt16BE(3) * 2
          break

        case 5:
        case 6:
        case 15:
        case 16:
          expectedBytes = 8
          break

        default:
          expectedBytes = 0
          break
      }

      if (this.inState('waiting') &&
        serialport.isOpen()) {
        serialport.write(bufWithCRC, function (err) {
          if (err) {
            this.log.error('error on write to serial:' + JSON.stringify(err))
            this.emit('error', err)
          } else {
            this.log.debug('package written to serialport')
          }
        }.bind(this))
      }
      setRequestTimeout()
    }.bind(this)

    this.close = function () {
      serialport.close()
    }

    init()
  })
