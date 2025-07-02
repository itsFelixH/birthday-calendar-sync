// Jest setup file

// Mock global variables and functions used in Google Apps Script
global.monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
global.monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// Mock Logger
global.Logger = {
  log: jest.fn()
};

// Mock Utilities
global.Utilities = {
  formatDate: jest.fn(),
  base64Encode: jest.fn(),
  base64EncodeWebSafe: jest.fn(),
  sleep: jest.fn(),
  Charset: {
    UTF_8: 'UTF-8'
  }
};

// Mock Session
global.Session = {
  getScriptTimeZone: jest.fn().mockReturnValue('UTC'),
  getActiveUser: jest.fn().mockReturnValue({
    getEmail: jest.fn().mockReturnValue('test@example.com')
  })
};

// Mock CalendarApp
global.CalendarApp = {
  getCalendarById: jest.fn()
};

// Mock DriveApp
global.DriveApp = {
  getFileById: jest.fn().mockReturnValue({
    getName: jest.fn().mockReturnValue('Test Script')
  })
};

// Mock ScriptApp
global.ScriptApp = {
  getScriptId: jest.fn().mockReturnValue('test-script-id')
};

// Mock People API
global.People = {
  People: {
    Connections: {
      list: jest.fn()
    }
  },
  ContactGroups: {
    list: jest.fn(),
    batchGet: jest.fn(),
    create: jest.fn()
  }
};

// Mock Gmail API
global.Gmail = {
  Users: {
    Messages: {
      send: jest.fn()
    }
  }
};