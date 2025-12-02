declare module 'react-native' {
  interface NativeModulesStatic {
    POSTerminalPrinter: {
      connectPrinterService(): Promise<boolean>;
      initializePrinter(): Promise<boolean>;
      printText(text: string): Promise<boolean>;
      printReceipt(text: string): Promise<boolean>;
      cutPaper(): Promise<boolean>;
      isPrinterConnected(): Promise<boolean>;
      getPrinterStatus(): Promise<number>;
      detectIPOSPrinter(): Promise<{
        found: boolean;
        serviceAvailable: boolean;
        aidlConnected: boolean;
        isConnected: boolean;
        packageName: string | null;
        action: string | null;
        serviceComponent: string | null;
      }>;
      // Paper feed and blank lines
      printerFeedLines(lines: number): Promise<boolean>;
      printBlankLines(lines: number, height: number): Promise<boolean>;
      // Text printing with formatting
      printSpecifiedTypeText(text: string, typeface: string, fontsize: number): Promise<boolean>;
      printSpecFormatText(text: string, typeface: string, fontsize: number, alignment: number): Promise<boolean>;
      // Table printing
      printColumnsText(params: {
        colsTextArr: string[];
        colsWidthArr: number[];
        colsAlign: number[];
        isContinuousPrint: number;
      }): Promise<boolean>;
      // Barcode printing
      printBarCode(data: string, symbology: number, height: number, width: number, textposition: number): Promise<boolean>;
      printQRCode(data: string, modulesize: number, errorCorrectionLevel: number): Promise<boolean>;
      // Printer settings (affect subsequent prints until initialization)
      setPrinterPrintDepth(depth: number): Promise<boolean>;
      setPrinterPrintFontType(typeface: string): Promise<boolean>;
      setPrinterPrintFontSize(fontsize: number): Promise<boolean>;
      setPrinterPrintAlignment(alignment: number): Promise<boolean>;
      // Image and raw data printing
      printBitmap(alignment: number, bitmapSize: number, bitmapBase64: string): Promise<boolean>;
      printRawData(rawData: string): Promise<boolean>;
      sendUserCMDData(cmdData: string): Promise<boolean>;
      // Print execution
      printerPerformPrint(feedlines: number): Promise<boolean>;
    };
  }
}




