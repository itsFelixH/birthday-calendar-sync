// Tests for LabelManager class

describe('LabelManager', () => {
  let labelManager;
  const mockPeople = {
    ContactGroups: {
      list: jest.fn(),
      batchGet: jest.fn(),
      create: jest.fn()
    }
  };

  const mockLabels = [
    { resourceName: 'contactGroups/123', name: 'Friends' },
    { resourceName: 'contactGroups/456', name: 'Family' }
  ];

  beforeEach(() => {
    // Mock global People object
    global.People = mockPeople;

    // Mock Logger
    global.Logger = {
      log: jest.fn()
    };

    // Setup mock responses
    mockPeople.ContactGroups.list.mockReturnValue({
      contactGroups: mockLabels.map(label => ({
        resourceName: label.resourceName
      }))
    });

    mockPeople.ContactGroups.batchGet.mockReturnValue({
      responses: mockLabels.map(label => ({
        contactGroup: label
      }))
    });

    labelManager = new LabelManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should fetch labels on initialization', () => {
      expect(mockPeople.ContactGroups.list).toHaveBeenCalled();
      expect(mockPeople.ContactGroups.batchGet).toHaveBeenCalled();
      expect(labelManager.labels).toHaveLength(2);
    });

    it('should handle API errors gracefully', () => {
      mockPeople.ContactGroups.list.mockImplementation(() => {
        throw new Error('API Error');
      });

      const errorLabelManager = new LabelManager();
      expect(errorLabelManager.labels).toEqual([]);
      expect(global.Logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching contact labels:')
      );
    });
  });

  describe('getLabelNameById', () => {
    it('should return label name for valid ID', () => {
      const name = labelManager.getLabelNameById('contactGroups/123');
      expect(name).toBe('Friends');
    });

    it('should return null for myContacts system label', () => {
      const name = labelManager.getLabelNameById('myContacts');
      expect(name).toBeNull();
    });

    it('should return null for starred system label', () => {
      const name = labelManager.getLabelNameById('starred');
      expect(name).toBeNull();
    });

    it('should return null for non-existent label ID', () => {
      const name = labelManager.getLabelNameById('contactGroups/999');
      expect(name).toBeNull();
    });
  });

  describe('getLabelNamesByIds', () => {
    it('should return array of label names for valid IDs', () => {
      const names = labelManager.getLabelNamesByIds(['contactGroups/123', 'contactGroups/456']);
      expect(names).toEqual(['Friends', 'Family']);
    });

    it('should filter out invalid IDs', () => {
      const names = labelManager.getLabelNamesByIds(['contactGroups/123', 'invalid']);
      expect(names).toEqual(['Friends']);
    });

    it('should return empty array for all invalid IDs', () => {
      const names = labelManager.getLabelNamesByIds(['invalid1', 'invalid2']);
      expect(names).toEqual([]);
    });
  });

  describe('labelExistsById', () => {
    it('should return true for existing label ID', () => {
      expect(labelManager.labelExistsById('contactGroups/123')).toBe(true);
    });

    it('should return true for existing label ID without prefix', () => {
      expect(labelManager.labelExistsById('123')).toBe(true);
    });

    it('should return false for non-existent label ID', () => {
      expect(labelManager.labelExistsById('contactGroups/999')).toBe(false);
    });
  });

  describe('labelExistsByName', () => {
    it('should return true for existing label name', () => {
      expect(labelManager.labelExistsByName('Friends')).toBe(true);
    });

    it('should return false for non-existent label name', () => {
      expect(labelManager.labelExistsByName('NonExistent')).toBe(false);
    });
  });

  describe('addLabel', () => {
    beforeEach(() => {
      mockPeople.ContactGroups.create.mockReturnValue({
        resourceName: 'contactGroups/789',
        name: 'New Label'
      });
    });

    it('should create new label successfully', () => {
      const newLabel = labelManager.addLabel('New Label');
      expect(mockPeople.ContactGroups.create).toHaveBeenCalledWith({
        contactGroup: { name: 'New Label' }
      });
      expect(newLabel).toEqual({
        id: 'contactGroups/789',
        name: 'New Label'
      });
      expect(labelManager.labels).toHaveLength(3);
    });

    it('should handle creation errors gracefully', () => {
      mockPeople.ContactGroups.create.mockImplementation(() => {
        throw new Error('Creation failed');
      });

      const result = labelManager.addLabel('Error Label');
      expect(result).toBeNull();
      expect(global.Logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Error adding contact label:')
      );
    });
  });

  describe('logAllLabels', () => {
    it('should log all label names', () => {
      labelManager.logAllLabels();
      expect(global.Logger.log).toHaveBeenCalledWith('Contact Labels: Friends, Family');
    });

    it('should handle empty labels array', () => {
      labelManager.labels = [];
      labelManager.logAllLabels();
      expect(global.Logger.log).toHaveBeenCalledWith('Contact Labels: ');
    });
  });
});