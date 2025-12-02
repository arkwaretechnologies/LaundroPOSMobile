# IPOS Printer API Implementation

Complete implementation of GZPDA03/POSPDA01 IPOS Printer Service API based on the SDK documentation.

## Connection & Initialization

### `connectPrinterService()`
Connect to the IPOS printer service via AIDL.
- **Returns**: `Promise<boolean>`
- **Usage**: `await POSTerminalPrinter.connectPrinterService()`

### `initializePrinter()`
Initialize the printer (powers on and sets default settings).
- **Returns**: `Promise<boolean>`
- **Usage**: `await POSTerminalPrinter.initializePrinter()`
- **Note**: Check printer status first. Wait if `PRINTER_IS_BUSY`.

### `isPrinterConnected()`
Check if printer service is connected.
- **Returns**: `Promise<boolean>`

### `getPrinterStatus()`
Get current printer status.
- **Returns**: `Promise<number>`
- **Status values**:
  - `0` = PRINTER_NORMAL
  - `1` = PRINTER_IS_BUSY
  - `2` = PRINTER_PAPER_OUT
  - `3` = PRINTER_ERROR

## Printer Settings (Affect subsequent prints until initialization)

### `setPrinterPrintDepth(depth: number)`
Set print depth/contrast level.
- **Parameters**: `depth` (1-10, default 6)
- **Returns**: `Promise<boolean>`

### `setPrinterPrintFontType(typeface: string)`
Set font type.
- **Parameters**: `typeface` ("ST" - currently only one supported)
- **Returns**: `Promise<boolean>`

### `setPrinterPrintFontSize(fontsize: number)`
Set font size.
- **Parameters**: `fontsize` (16, 24, 32, 48 - invalid size defaults to 24)
- **Returns**: `Promise<boolean>`

### `setPrinterPrintAlignment(alignment: number)`
Set text alignment.
- **Parameters**: `alignment` (0=left, 1=center, 2=right, default center)
- **Returns**: `Promise<boolean>`

## Paper Feed

### `printerFeedLines(lines: number)`
Feed paper lines (forced line feed, motor idling, no data sent to printer).
- **Parameters**: `lines` - Number of printer feed lines (each line is one pixel)
- **Returns**: `Promise<boolean>`
- **Usage**: `await POSTerminalPrinter.printerFeedLines(3)`

### `printBlankLines(lines: number, height: number)`
Print blank lines (forced line feed, data sent is all 0x00).
- **Parameters**: 
  - `lines` - Number of blank lines (max 100)
  - `height` - Height of blank line in pixels
- **Returns**: `Promise<boolean>`
- **Note**: Not recommended, use `printerFeedLines` instead.

## Text Printing

### `printText(text: string)`
Print text (auto line wrap, uses previous font settings).
- **Parameters**: `text` - Text string to print
- **Returns**: `Promise<boolean>`

### `printSpecifiedTypeText(text: string, typeface: string, fontsize: number)`
Print text with specified font type and size (settings only apply to this print).
- **Parameters**:
  - `text` - Text string to print
  - `typeface` - Font name ("ST" - currently only one supported)
  - `fontsize` - Font size (16, 24, 32, 48 - invalid defaults to 24)
- **Returns**: `Promise<boolean>`

### `printSpecFormatText(text: string, typeface: string, fontsize: number, alignment: number)`
Print text with specified font type, size, and alignment (settings only apply to this print).
- **Parameters**:
  - `text` - Text string to print
  - `typeface` - Font name ("ST")
  - `fontsize` - Font size (16, 24, 32, 48)
  - `alignment` - Alignment (0=left, 1=center, 2=right)
- **Returns**: `Promise<boolean>`

### `printColumnsText(params: object)`
Print a table row with specified column widths and alignment.
- **Parameters**: Object with:
  - `colsTextArr: string[]` - Array of text strings for each column
  - `colsWidthArr: number[]` - Array of column widths
  - `colsAlign: number[]` - Array of alignments (0=left, 1=center, 2=right)
  - `isContinuousPrint: number` - Continue printing table (1=continue, 0=don't continue)
- **Returns**: `Promise<boolean>`
- **Usage**:
  ```typescript
  await POSTerminalPrinter.printColumnsText({
    colsTextArr: ['Item', 'Price'],
    colsWidthArr: [20, 12],
    colsAlign: [0, 2],
    isContinuousPrint: 0
  })
  ```

## Image Printing

### `printBitmap(alignment: number, bitmapSize: number, bitmapBase64: string)`
Print bitmap image.
- **Parameters**:
  - `alignment` - Alignment (0=left, 1=center, 2=right, default center)
  - `bitmapSize` - Bitmap size (1-16, default 10, unit: 24 pixels)
  - `bitmapBase64` - Base64 encoded bitmap image string
- **Returns**: `Promise<boolean>`
- **Note**: Maximum width is 384 pixels
- **Usage**:
  ```typescript
  // Convert image to base64 first
  const base64 = await convertImageToBase64(imageUri);
  await POSTerminalPrinter.printBitmap(1, 10, base64);
  ```

## Barcode Printing

### `printBarCode(data: string, symbology: number, height: number, width: number, textposition: number)`
Print 1D barcode.
- **Parameters**:
  - `data` - Barcode data string
  - `symbology` - Barcode type:
    - `0` = UPC-A
    - `1` = UPC-E (currently not supported)
    - `2` = JAN13/EAN13
    - `3` = JAN8/EAN8
    - `4` = CODE39
    - `5` = ITF
    - `6` = CODABAR
    - `7` = CODE93 (not supported)
    - `8` = CODE128
  - `height` - Barcode height (1-16, default 6, each unit = 24 pixels)
  - `width` - Barcode width (1-16, default 12, each unit = 24 pixels)
  - `textposition` - Text position (0=no text, 1=above, 2=below, 3=above and below)
- **Returns**: `Promise<boolean>`

### `printQRCode(data: string, modulesize: number, errorCorrectionLevel: number)`
Print QR code.
- **Parameters**:
  - `data` - QR code data string
  - `modulesize` - QR code block size (1-16, default 10, unit: 24 pixels)
  - `errorCorrectionLevel` - Error correction level:
    - `0` = L (7%)
    - `1` = M (15%)
    - `2` = Q (25%)
    - `3` = H (30%)
- **Returns**: `Promise<boolean>`

## Raw Data Printing

### `printRawData(rawData: string)`
Print raw byte data.
- **Parameters**: `rawData` - Base64 encoded byte array
- **Returns**: `Promise<boolean>`

### `sendUserCMDData(cmdData: string)`
Send ESC/POS command data.
- **Parameters**: `cmdData` - Base64 encoded ESC/POS command byte array
- **Returns**: `Promise<boolean>`

## Print Execution

### `printerPerformPrint(feedlines: number)`
Execute printing task (for plain printing only, not label printing).
- **Parameters**: `feedlines` - Number of paper feed lines after printing
- **Returns**: `Promise<boolean>`
- **Important**: Must be called after all print methods to actually print.
- **Note**: Check printer status first. Only valid when status is `PRINTER_NORMAL`.

### `cutPaper()`
Cut paper (convenience method that calls `printerPerformPrint(3)`).
- **Returns**: `Promise<boolean>`

## Detection

### `detectIPOSPrinter()`
Detect if IPOS printer service is available on the device.
- **Returns**: `Promise<object>` with:
  - `found: boolean` - Is the service package found?
  - `serviceAvailable: boolean` - Can the service be resolved?
  - `aidlConnected: boolean` - Is AIDL connection established?
  - `isConnected: boolean` - Same as aidlConnected
  - `packageName: string | null` - Package name if found
  - `action: string | null` - Service action if found

## Not Available

### `printerPerformLabelAndBlackmarkPrint`
**Not implemented** - This method is not available in the current AIDL interface. It may be available in newer SDK versions or specific printer models.

## Complete Usage Example

```typescript
import POSTerminalPrinterService from './services/POSTerminalPrinterService';

// 1. Connect and initialize
await POSTerminalPrinterService.connectPrinterService();
await POSTerminalPrinterService.initializePrinter();

// 2. Set printer settings (affects all subsequent prints)
await POSTerminalPrinterService.setPrinterPrintDepth(6);
await POSTerminalPrinterService.setPrinterPrintFontSize(24);
await POSTerminalPrinterService.setPrinterPrintAlignment(1); // Center

// 3. Print text
await POSTerminalPrinterService.printText('Hello World!');

// 4. Print formatted text (one-time settings)
await POSTerminalPrinterService.printSpecFormatText(
  'Special Text',
  'ST',
  32,
  1 // Center
);

// 5. Print table row
await POSTerminalPrinterService.printColumnsText(
  ['Item', 'Price', 'Total'],
  [15, 10, 10],
  [0, 2, 2], // Left, Right, Right
  0 // Don't continue
);

// 6. Print barcode
await POSTerminalPrinterService.printBarCode(
  '123456789012',
  2, // EAN13
  6, // Height
  12, // Width
  2 // Text below
);

// 7. Print QR code
await POSTerminalPrinterService.printQRCode(
  'https://example.com',
  10, // Module size
  1 // Error correction M
);

// 8. Feed paper
await POSTerminalPrinterService.printerFeedLines(3);

// 9. Execute print (required after all print methods)
await POSTerminalPrinterService.printerPerformPrint(3);

// Or use cutPaper() convenience method
await POSTerminalPrinterService.cutPaper();
```

## Service Wrapper Methods

All methods are available through the service wrapper:

```typescript
import POSTerminalPrinterService from './services/POSTerminalPrinterService';

// All methods return Promise<boolean> (except getPrinterStatus and detectIPOSPrinter)
await POSTerminalPrinterService.printText('Hello');
await POSTerminalPrinterService.printBarCode('12345', 8, 6, 12, 2);
```

## Direct Native Module Usage

You can also use the native module directly:

```typescript
import { NativeModules } from 'react-native';

const { POSTerminalPrinter } = NativeModules;

await POSTerminalPrinter.printText('Hello');
await POSTerminalPrinter.printBarCode('12345', 8, 6, 12, 2);
```

## Important Notes

1. **Always call `printerPerformPrint()`** after all print methods to actually execute the print
2. **Check printer status** before printing (especially before `printerPerformPrint`)
3. **Font settings** set via `setPrinterPrint*` methods affect all subsequent prints until initialization
4. **One-time settings** in `printSpecifiedTypeText` and `printSpecFormatText` only apply to that specific print
5. **Bitmap width** must not exceed 384 pixels
6. **Blank lines** are limited to 100 lines maximum
7. **All methods use callbacks** - the Promise resolves when the callback is received
