import { NativeModules, Platform } from 'react-native'

class PrinterDebugger {
  static debugAvailableModules(): void {
    console.log('🔍 === PRINTER DEBUG INFO ===')
    console.log(`Platform: ${Platform.OS}`)
    console.log(`Platform Version: ${Platform.Version}`)
    
    if (Platform.OS === 'android') {
      console.log(`Android Model: ${Platform.constants?.Model || 'Unknown'}`)
      console.log(`Android Brand: ${Platform.constants?.Brand || 'Unknown'}`)
      console.log(`Android Manufacturer: ${Platform.constants?.Manufacturer || 'Unknown'}`)
    }
    
    console.log('\n📱 Available Native Modules:')
    const modules = Object.keys(NativeModules)
    modules.forEach((module, index) => {
      console.log(`  ${index + 1}. ${module}`)
    })
    
    console.log('\n🖨️ Printer-related modules:')
    const printerModules = modules.filter(module => 
      module.toLowerCase().includes('print') || 
      module.toLowerCase().includes('thermal') ||
      module.toLowerCase().includes('receipt') ||
      module.toLowerCase().includes('pos') ||
      module.toLowerCase().includes('pda') ||
      module.toLowerCase().includes('printer')
    )
    
    if (printerModules.length > 0) {
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
    } else {
      console.log('  ❌ No printer-related modules found')
    }
    
    console.log('🔍 === END DEBUG INFO ===\n')
  }

  static async findWorkingPrinter(): Promise<{module: string, method: string} | null> {
    console.log('🔍 Searching for working printer module...')
    
    const modules = Object.keys(NativeModules)
    const printerMethods = [
      'printText', 'print', 'sendText', 'writeText', 'printReceipt',
      'printString', 'printData', 'sendData', 'printRaw', 'printLine'
    ]
    
    for (const moduleName of modules) {
      const module = NativeModules[moduleName]
      if (module) {
        for (const method of printerMethods) {
          if (typeof module[method] === 'function') {
            try {
              console.log(`Testing ${moduleName}.${method}...`)
              // Try a simple test call
              await module[method]('TEST')
              console.log(`✅ Working printer found: ${moduleName}.${method}`)
              return { module: moduleName, method }
            } catch (error) {
              console.log(`❌ ${moduleName}.${method} failed:`, error instanceof Error ? error.message : String(error))
            }
          }
        }
      }
    }
    
    console.log('❌ No working printer module found')
    return null
  }
}

export default PrinterDebugger




