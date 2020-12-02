/* eslint-disable require-jsdoc */

export default function createDay(
    i,
    d,
    currentDate,
    noteFunc,
    noteFuncThisArg,
    onUpdateNote,
    onUpdateNoteThisArg,
) {
  const names = getListOfDays();
  const weekday = names[i];

  const futureStyleName = 'b';
  const pastStyleName = 's';

  const noteStyle = copyStyle(BLOCK);
  noteStyle.minWidth = 500;
  noteStyle.minHeight = 200;
  noteStyle.backgroundColor = new Color(1, 1, 0.9);

  const pastNoteStyle = copyStyle(SLOT);
  pastNoteStyle.minWidth = 500;
  pastNoteStyle.minHeight = 200;

  const workNoteStyle = copyStyle(BLOCK);
  workNoteStyle.minWidth = 500;
  workNoteStyle.minHeight = 200;
  workNoteStyle.backgroundColor = new Color(0.9, 1, 1);

  const car = new Caret('bu');
  car.shrink();

  const isWorkday = weekday !== 'Sunday' && weekday !== 'Saturday';
  for (let h = 0; h < 24; ++h) {
    if (h > 0) {
      car.spawnMove(DOWNWARD, BUD);
    }
    car.spawnMove(BACKWARD, futureStyleName);
    switch (h) {
      case 0:
        car.label('Midnight');
        break;
      case 12:
        car.label('Noon');
        break;
      default:
        car.label((h % 12) + (h > 12 ? 'PM' : 'AM'));
    }
    if (d && datesEqual(d, currentDate)) {
      if (h < currentDate.getHours()) {
        car.replace(pastStyleName);
      }
    } else if (d && !dateGreater(d, currentDate)) {
      car.replace(pastStyleName);
    }
    car.move('f');
    car.spawnMove('f', 's');
    car
        .node()
        .setBlockStyle(isWorkday && h >= 9 && h < 17 ? workNoteStyle : noteStyle);
    if (typeof noteFunc === 'function') {
      car.label(noteFunc.call(noteFuncThisArg, h));
    } else {
      car.label('');
    }
    car.node().realLabel().setEditable(true);
    if (onUpdateNote) {
      car
          .node()
          .realLabel()
          .onTextChanged(function() {
            onUpdateNote.call(
                onUpdateNoteThisArg,
                d,
                this.value(),
                this.realLabel().text(),
            );
          }, car.node());
      car.node().setValue(h);
    }
    if (d && datesEqual(d, currentDate)) {
      if (h < currentDate.getHours()) {
        car.node().setBlockStyle(pastNoteStyle);
      }
    }
    car.move('b');
  }
  car.moveToRoot();
  return car.root();
}

export default function CalendarWidget(belt, world) {
  this._belt = belt;
  this._world = world;
}

CalendarWidget.prototype.noteID = function(d, h) {
  return (
    'CalendarWidget-' + outputDate(d, true, false, false) + '@' + h
  );
};

CalendarWidget.prototype.scheduleUpdate = function() {
  this._belt.scheduleUpdate();
  this._world.scheduleRepaint();
};

CalendarWidget.prototype.updateNote = function(d, h, note) {
  // console.log(d + " " + note);
  localStorage.setItem(this.noteID(d, h), note);
  // console.log(this.noteID(d, h));
  this.scheduleUpdate();
};

CalendarWidget.prototype.getNote = function(d, h) {
  const rv = localStorage.getItem(this.noteID(d, h));
  if (rv === null) {
    return '';
  }
  return rv;
};

CalendarWidget.prototype.pastStyleName = function() {
  return 'slot';
};

CalendarWidget.prototype.futureStyleName = function() {
  return 'block';
};

CalendarWidget.prototype.createWeek = function(
    d,
    currentDate,
    firstWeekOfYear,
    lastWeekOfYear,
) {
  const caret = new Caret(BUD);

  if (firstWeekOfYear && lastWeekOfYear) {
    throw new Error(
        'A week cannot be both the first and the last week of the same year.',
    );
  }

  // Spawn empty blocks to reach the date.
  if (firstWeekOfYear && d.getDate() !== 1 && d.getMonth() !== 0) {
    const y = d.getFullYear();
    while (y === d.getFullYear()) {
      caret.spawnMove(
          'f',
        d.getFullYear() + 1 <= currentDate.getFullYear() ?
          this.pastStyleName() :
          this.futureStyleName(),
      );
      d = nextDay(d);
    }
  }

  const dayNames = getListOfDays();
  const monthNames = getListOfMonths();

  const year = d.getFullYear();

  let weekLabel = '';
  let thisMonth = -1;
  do {
    // Show another day.
    caret.spawnMove('f', this.pastStyleName());

    if (!lastWeekOfYear || d.getFullYear() === year) {
      if (thisMonth === -1) {
        thisMonth = d.getMonth();
        if (d.getDate() === 1) {
          weekLabel = outputMonth(d);
        }
      } else if (thisMonth !== d.getMonth()) {
        // Changed months.
        weekLabel = outputMonth(d);
      }
    }

    if (dateGreater(d, currentDate)) {
      caret.replace(this.futureStyleName());
    } else if (datesEqual(d, currentDate)) {
      const bColor = style(BLOCK).backgroundColor;
      const sColor = style(SLOT).backgroundColor;
    } else {
      // console.log(
      //   d +
      //   " is less than " +
      //   currentDate + ", so it stays a block.");
    }

    if (!lastWeekOfYear || d.getFullYear() === year) {
      if (
        currentDate.getFullYear() === d.getFullYear() &&
        (datesEqual(
            getFirstDayOfWeek(d),
            getFirstDayOfWeek(currentDate),
        ) ||
          datesEqual(
              getFirstDayOfWeek(nextWeek(currentDate)),
              getFirstDayOfWeek(d),
          ))
      ) {
        // console.log(d.getFullYear() + " " + currentDate.getFullYear());
        caret.label(
            dayNames[d.getDay()] +
            ', ' +
            monthNames[d.getMonth()] +
            ' ' +
            d.getDate() +
            ', ' +
            d.getFullYear(),
        );
        caret.align('i', 'v');
        caret.connect(
            'i',
            createDay(
                d.getDay(),
                d,
                currentDate,
                function(h) {
                  return this.getNote(d, h);
                },
                this,
                this.updateNote,
                this,
            ),
        );
      } else {
        // Label the date block.
        caret.label(d.getDate());
      }
    }

    // Advance to the next day.
    d = nextDay(d);
  } while (d.getDay() !== 0);

  caret.moveToRoot();
  caret.shrink('f');

  if (typeof weekLabel === 'string' && weekLabel.length > 0) {
    if (
      d.getFullYear() < currentDate.getFullYear() ||
      (d.getFullYear() === currentDate.getFullYear() &&
        d.getMonth() < currentDate.getMonth())
    ) {
      caret.spawnMove('b', this.pastStyleName());
    } else {
      caret.spawnMove('b', this.futureStyleName());
    }
    caret.label(weekLabel);
    caret.move('f');
  }

  return caret.node();
};

CalendarWidget.prototype.createYear = function(year, currentDate) {
  const caret = new Caret(BUD);

  let d = getFirstDayOfWeek(new Date(year, 0, 1));
  for (let i = 0; i <= 52; ++i) {
    if (d.getFullYear() > year) {
      break;
    }
    if (i === 0) {
      caret.push();
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function(t) {
        caret.spawnMove(
            'f',
          year <= currentDate.getFullYear() ?
            this.pastStyleName() :
            this.futureStyleName(),
        );
        caret.label(t);
      }, this);
      caret.pop();
      caret.shrink('f');
    }

    caret.connect(
        DOWNWARD,
        this.createWeek(d, currentDate, i === 0, i === 52),
    );
    caret.move(DOWNWARD);
    if (i === 0) {
      if (!caret.has(BACKWARD)) {
        caret.spawnMove(
            BACKWARD,
          year === currentDate.getFullYear() ?
            BLOCK :
            SLOT,
        );
      } else {
        caret.move(BACKWARD);
      }
      caret.replace(
        year <= currentDate.getFullYear() ?
          this.futureStyleName() :
          this.pastStyleName(),
      );
      caret.label('January ' + year);
      caret.move(FORWARD);
    }
    d = nextWeek(d);
  }
  caret.moveToRoot();
  return caret.node();
};

CalendarWidget.prototype.createCalendar = function(
    currentDate,
    previousYears,
    nextYears,
) {
  if (arguments.length === 1) {
    previousYears = 0;
    nextYears = 0;
  } else if (arguments.length === 0) {
    currentDate = new Date();
    previousYears = 0;
    nextYears = 0;
  }

  if (currentDate === undefined) {
    // Use today's date.
    currentDate = new Date();
  }

  const year = currentDate.getFullYear();
  const caret = new Caret(SLOT);
  caret.label(year);
  caret.align('d', 'c');
  caret.connect('d', this.createYear(year, currentDate));
  caret.pull('d');
  caret.crease();

  caret.push();
  for (let i = 1; i <= previousYears; ++i) {
    caret.spawnMove('b', this.pastStyleName());
    caret.pull('d');
    caret.label(year - i);
    caret.align('d', 'c');
    caret.connect('d', this.createYear(year - i, currentDate));
    caret.crease();
  }
  caret.pop();

  caret.push();
  for (let i = 1; i <= nextYears; ++i) {
    caret.spawnMove('f', this.futureStyleName());
    caret.pull('d');
    caret.label(year + i);
    caret.align('d', 'c');
    caret.connect('d', this.createYear(year + i, currentDate));
    caret.crease();
  }
  caret.pop();

  return caret.root();
};
