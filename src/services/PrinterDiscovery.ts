import { NativeModules, Platform } from 'react-native'

class PrinterDiscovery {
  static async discoverAllPrintMethods(): Promise<string[]> {
    console.log('🔍 === COMPREHENSIVE PRINTER DISCOVERY ===')
    
    const workingMethods: string[] = []
    
    try {
      // Get all available native modules
      const allModules = Object.keys(NativeModules)
      console.log(`Found ${allModules.length} native modules:`)
      allModules.forEach((module, index) => {
        console.log(`  ${index + 1}. ${module}`)
      })
      
      // Check for printer-related modules
      const printerModules = allModules.filter(module => 
        module.toLowerCase().includes('print') || 
        module.toLowerCase().includes('thermal') ||
        module.toLowerCase().includes('receipt') ||
        module.toLowerCase().includes('pos') ||
        module.toLowerCase().includes('pda') ||
        module.toLowerCase().includes('printer') ||
        module.toLowerCase().includes('esc') ||
        module.toLowerCase().includes('pos')
      )
      
      console.log(`\n🖨️ Printer-related modules found: ${printerModules.length}`)
      printerModules.forEach(module => {
        console.log(`  ✅ ${module}`)
        const moduleObj = NativeModules[module]
        if (moduleObj) {
          const methods = Object.getOwnPropertyNames(moduleObj).filter(prop => 
            typeof moduleObj[prop] === 'function'
          )
          console.log(`     Methods: ${methods.join(', ')}`)
        }
      })
      
      // Test each printer module with more detailed logging
      for (const moduleName of printerModules) {
        const module = NativeModules[moduleName]
        if (module) {
          const methods = Object.getOwnPropertyNames(module).filter(prop => 
            typeof module[prop] === 'function'
          )
          
          console.log(`\n🔍 Testing module: ${moduleName}`)
          console.log(`   Available methods: ${methods.join(', ')}`)
          
          for (const method of methods) {
            try {
              console.log(`\n🧪 Testing ${moduleName}.${method}...`)
              
              // Try different parameter combinations with detailed logging
              const testParams = [
                { name: 'Simple string', fn: () => module[method]('TEST') },
                { name: 'String with options', fn: () => module[method]('TEST', {}) },
                { name: 'Object with text', fn: () => module[method]({ text: 'TEST' }) },
                { name: 'Object with data', fn: () => module[method]({ data: 'TEST' }) },
                { name: 'Object with content', fn: () => module[method]({ content: 'TEST' }) },
                { name: 'String with encoding', fn: () => module[method]('TEST', { encoding: 'utf8' }) },
                { name: 'String with type', fn: () => module[method]('TEST', { type: 'text' }) },
                { name: 'String with charset', fn: () => module[method]('TEST', { charset: 'utf8' }) },
                { name: 'String with format', fn: () => module[method]('TEST', { format: 'plain' }) },
                { name: 'Empty string', fn: () => module[method]('') },
                { name: 'Null parameter', fn: () => module[method](null) },
                { name: 'Undefined parameter', fn: () => module[method](undefined) }
              ]
              
              for (const testParam of testParams) {
                try {
                  console.log(`     Trying ${testParam.name}...`)
                  await testParam.fn()
                  const methodKey = `${moduleName}.${method}`
                  if (!workingMethods.includes(methodKey)) {
                    workingMethods.push(methodKey)
                    console.log(`     ✅ ${methodKey} - WORKING with ${testParam.name}!`)
                  }
                } catch (paramError) {
                  console.log(`     ❌ ${testParam.name} failed: ${paramError instanceof Error ? paramError.message : String(paramError)}`)
                }
              }
            } catch (methodError) {
              console.log(`   ❌ Method ${method} failed: ${methodError instanceof Error ? methodError.message : String(methodError)}`)
            }
          }
        }
      }
      
      // Test ALL modules for any printing-related methods
      console.log('\n🔍 Testing ALL modules for printing methods...')
      const printMethods = ['print', 'printText', 'printString', 'printData', 'sendText', 'writeText', 'printReceipt', 'printLine', 'printRaw', 'sendData', 'printContent', 'printDocument', 'printJob', 'printBuffer', 'printBytes', 'printArray', 'printStream', 'printOutput', 'printResult', 'printCommand', 'printEscPos', 'printThermal']
      
      for (const moduleName of allModules) {
        const module = NativeModules[moduleName]
        if (module) {
          for (const method of printMethods) {
            if (typeof module[method] === 'function') {
              try {
                console.log(`🧪 Testing ${moduleName}.${method}...`)
                await module[method]('TEST')
                const methodKey = `${moduleName}.${method}`
                if (!workingMethods.includes(methodKey)) {
                  workingMethods.push(methodKey)
                  console.log(`  ✅ ${methodKey} - WORKING!`)
                }
              } catch (methodError) {
                // Silent fail for non-printer modules
              }
            }
          }
        }
      }
      
      // Check for system properties and device identification
      if (Platform.OS === 'android') {
        console.log('\n🔍 Checking Android system properties and device identification...')
        const systemProps = [
          'ro.build.product', 'ro.product.model', 'ro.product.brand',
          'ro.product.manufacturer', 'ro.hardware', 'ro.board.platform',
          'ro.printer.name', 'ro.thermal.printer', 'ro.pos.printer',
          'ro.device.printer', 'ro.builtin.printer', 'ro.pda.printer',
          'ro.build.description', 'ro.build.fingerprint', 'ro.build.version.release',
          'ro.build.display.id', 'ro.product.device', 'ro.product.name'
        ]
        
        let deviceInfo = {
          brand: '',
          model: '',
          manufacturer: '',
          product: '',
          hardware: ''
        }
        
        for (const prop of systemProps) {
          try {
            const SystemProperties = NativeModules.SystemProperties || NativeModules.SystemPropertiesModule
            if (SystemProperties && SystemProperties.get) {
              const value = await SystemProperties.get(prop)
              if (value && value !== '') {
                console.log(`  ${prop}: ${value}`)
                
                // Store key device info
                if (prop === 'ro.product.brand') deviceInfo.brand = value.toLowerCase()
                if (prop === 'ro.product.model') deviceInfo.model = value.toLowerCase()
                if (prop === 'ro.product.manufacturer') deviceInfo.manufacturer = value.toLowerCase()
                if (prop === 'ro.build.product') deviceInfo.product = value.toLowerCase()
                if (prop === 'ro.hardware') deviceInfo.hardware = value.toLowerCase()
              }
            }
          } catch (propError) {
            // Silent fail for property errors
          }
        }
        
        // Identify the device type and suggest appropriate SDK
        console.log('\n🔍 Device Identification:')
        console.log(`  Brand: ${deviceInfo.brand}`)
        console.log(`  Model: ${deviceInfo.model}`)
        console.log(`  Manufacturer: ${deviceInfo.manufacturer}`)
        console.log(`  Product: ${deviceInfo.product}`)
        console.log(`  Hardware: ${deviceInfo.hardware}`)
        
        // Check for known POS terminal brands
        const knownBrands = {
          'sunmi': 'SunmiPrinterService (com.sunmi.printerhelper)',
          'rongta': 'RongtaPrinterLib (com.rt.printerlib)',
          'urovo': 'UrovoPrinterService',
          'pax': 'PAXPrinterService',
          'newland': 'NewlandPrinterService',
          'pos': 'Generic POS Printer Service',
          'a8': 'A8 POS Terminal SDK',
          'p8': 'P8 POS Terminal SDK',
          'x990': 'X990 POS Terminal SDK',
          'qpos': 'QPOS Terminal SDK'
        }
        
        for (const [brand, sdk] of Object.entries(knownBrands)) {
          if (deviceInfo.brand.includes(brand) || 
              deviceInfo.model.includes(brand) || 
              deviceInfo.manufacturer.includes(brand) ||
              deviceInfo.product.includes(brand) ||
              deviceInfo.hardware.includes(brand)) {
            console.log(`\n🎯 Detected ${brand.toUpperCase()} device!`)
            console.log(`   Recommended SDK: ${sdk}`)
            console.log(`   This device uses a built-in thermal printer via vendor SDK`)
            console.log(`   Bluetooth printing will NOT work - you need the manufacturer's SDK`)
            break
          }
        }
      }
      
      console.log(`\n🎯 Working printer methods found: ${workingMethods.length}`)
      workingMethods.forEach(method => {
        console.log(`  ✅ ${method}`)
      })
      
      console.log('🔍 === END PRINTER DISCOVERY ===\n')
      
    } catch (error) {
      console.error('Printer discovery failed:', error)
    }
    
    return workingMethods
  }
  
  static async testPrintWithMethod(moduleName: string, methodName: string, text: string): Promise<boolean> {
    try {
      const module = NativeModules[moduleName]
      if (!module || typeof module[methodName] !== 'function') {
        return false
      }
      
      // Try different parameter formats
      const paramFormats = [
        () => module[methodName](text),
        () => module[methodName](text, {}),
        () => module[methodName]({ text }),
        () => module[methodName]({ data: text }),
        () => module[methodName]({ content: text }),
        () => module[methodName](text, { encoding: 'utf8' }),
        () => module[methodName](text, { type: 'text' }),
        () => module[methodName](text, { format: 'plain' })
      ]
      
      for (const paramFormat of paramFormats) {
        try {
          await paramFormat()
          
          // Try to cut paper
          if (module.cutPaper) {
            await module.cutPaper()
          } else if (module.cut) {
            await module.cut()
          }
          
          console.log(`✅ Print successful via ${moduleName}.${methodName}`)
          return true
        } catch (paramError) {
          // Try next parameter format
        }
      }
      
      return false
    } catch (error) {
      console.error(`Print test failed for ${moduleName}.${methodName}:`, error)
      return false
    }
  }
}

export default PrinterDiscovery
