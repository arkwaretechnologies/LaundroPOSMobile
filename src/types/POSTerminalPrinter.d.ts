declare module 'react-native' {
  interface NativeModulesStatic {
    POSTerminalPrinter: {
      initializePrinter(): Promise<boolean>;
      printText(text: string): Promise<boolean>;
      printReceipt(text: string): Promise<boolean>;
      cutPaper(): Promise<boolean>;
      isPrinterConnected(): Promise<boolean>;
      getPrinterStatus(): Promise<string>;
    };
  }
}




