export const COMPONENT_LAYOUT_VERTICAL = 'LAYOUT_VERTICAL';
export const COMPONENT_LAYOUT_HORIZONTAL = 'LAYOUT_HORIZONTAL';
export const COMPONENT_LAYOUT_ENTRY = 'LAYOUT_ENTRY';
/* eslint-disable require-jsdoc */

export default function LayoutList(type, parent) {
  this._type = type;
  this._parent = parent;
  this._entries = [];
}

LayoutList.prototype.setEntry = function(comp) {
  if (this._entries[0]) {
    throw new Error('A layout list must not change its entry once set');
  }
  this._entries[0] = comp;
};

LayoutList.prototype.component = function() {
  return this._entries[0];
};

LayoutList.prototype.type = function() {
  return this._type;
};

LayoutList.prototype.addWithType = function(comp, layoutType) {
  if (
    layoutType !== COMPONENT_LAYOUT_HORIZONTAL &&
    layoutType !== COMPONENT_LAYOUT_VERTICAL
  ) {
    throw new Error(
        'LayoutList type must be horizontal or vertical when adding with type.',
    );
  }
  let entry;
  if (this._type === COMPONENT_LAYOUT_ENTRY) {
    if (this._parent && layoutType === this._parent.type()) {
      const entry = new LayoutList(
          COMPONENT_LAYOUT_ENTRY,
          this._parent,
      );
      entry.setEntry(comp);
      for (const i in this._parent._entries) {
        if (this._parent._entries[i] === this) {
          this._parent._entries.splice(i + 1, 0, entry);
          return;
        }
      }
      throw new Error('Failed to insert entry into parent');
    }
    // console.log("Changing list from entry");
    this._type = layoutType;
    const firstEntry = new LayoutList(
        COMPONENT_LAYOUT_ENTRY,
        this,
    );
    firstEntry.setEntry(this.component());
    entry = new LayoutList(COMPONENT_LAYOUT_ENTRY, this);
    entry.setEntry(comp);
    this._entries[0] = firstEntry;
    this._entries[1] = entry;
    return;
  }
  if (
    this._type === layoutType ||
    this._entries.length === 0 ||
    (this._entries.length === 1 &&
      this._entries[0].type() === COMPONENT_LAYOUT_ENTRY)
  ) {
    // console.log("Repurposing list");
    this._type = layoutType;
    entry = new LayoutList(COMPONENT_LAYOUT_ENTRY, this);
    entry.setEntry(comp);
    this._entries.push(entry);
  } else {
    // console.log("Creating nested list");
    const firstEntry = new LayoutList(layoutType, this);
    firstEntry.addWithType(comp, layoutType);
    this._entries.push(firstEntry);
  }
};

LayoutList.prototype.addVertical = function(comp) {
  return this.addWithType(comp, COMPONENT_LAYOUT_VERTICAL);
};

LayoutList.prototype.addHorizontal = function(comp) {
  return this.addWithType(comp, COMPONENT_LAYOUT_HORIZONTAL);
};

LayoutList.prototype.forEach = function(
    func,
    funcThisArg,
    compSize,
) {
  if (this._type === COMPONENT_LAYOUT_ENTRY) {
    return func.call(funcThisArg, this.component(), compSize);
  }
  const entrySize = compSize ? compSize.clone() : null;
  for (const i in this._entries) {
    if (compSize) {
      if (this._type === COMPONENT_LAYOUT_HORIZONTAL) {
        entrySize.setWidth(compSize.width() / this._entries.length);
        entrySize.setX(compSize.x() + i * entrySize.width());
      } else {
        entrySize.setHeight(compSize.height() / this._entries.length);
        entrySize.setY(
            compSize.y() + (this._entries.length - 1 - i) * entrySize.height(),
        );
      }
    }
    const entry = this._entries[i];
    if (entry.forEach(func, funcThisArg, entrySize)) {
      return true;
    }
  }
};

LayoutList.prototype.isEmpty = function() {
  return this._entries.length === 0;
};

LayoutList.prototype.getPrevious = function(target) {
  let prior = null;
  if (
    this.forEach(function(comp) {
      if (target === comp) {
        return true;
      }
      prior = comp;
    }, this)
  ) {
    return prior;
  }
  return null;
};

LayoutList.prototype.getNext = function(target) {
  let next = null;
  let found = false;
  if (
    this.forEach(function(comp) {
      if (found) {
        next = comp;
        return true;
      }
      if (target === comp) {
        found = true;
      }
    }, this)
  ) {
    return next;
  }
  return null;
};

LayoutList.prototype.remove = function(comp) {
  if (this._type === COMPONENT_LAYOUT_ENTRY) {
    throw new Error('A layoutList entry cannot remove itself');
  }
  for (const i in this._entries) {
    const entry = this._entries[i];
    if (entry.type() === COMPONENT_LAYOUT_ENTRY) {
      if (entry.component() === comp) {
        this._entries.splice(i, 1);
        return true;
      }
    } else {
      if (entry.remove(comp)) {
        if (entry.isEmpty()) {
          this._entries.splice(i, 1);
        }
        return true;
      }
    }
  }
  return false;
};

LayoutList.prototype.contains = function(comp) {
  if (this._type === COMPONENT_LAYOUT_ENTRY) {
    return this.component() === comp ? this : null;
  }
  for (const i in this._entries) {
    const entry = this._entries[i];
    const found = entry.contains(comp);
    if (found) {
      return found;
    }
  }
  return null;
};

LayoutList.prototype.count = function() {
  if (this._type === COMPONENT_LAYOUT_ENTRY) {
    return this.component() ? 1 : 0;
  }
  let c = 0;
  for (const i in this._entries) {
    const entry = this._entries[i];
    c += entry.count();
  }
  return c;
};
