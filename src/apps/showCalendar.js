function createDay(i, d, currentDate, noteFunc, noteFuncThisArg, onUpdateNote, onUpdateNoteThisArg) {
    var names = parsegraph_getListOfDays();
    var weekday = names[i];

    var futureStyleName = 'b';
    var pastStyleName = 's';

    var noteStyle = parsegraph_copyStyle(parsegraph_BLOCK);
    noteStyle.minWidth = 500;
    noteStyle.minHeight = 200;
    noteStyle.backgroundColor = new parsegraph_Color(1, 1, .9);

    var pastNoteStyle = parsegraph_copyStyle(parsegraph_SLOT);
    pastNoteStyle.minWidth = 500;
    pastNoteStyle.minHeight = 200;

    var workNoteStyle = parsegraph_copyStyle(parsegraph_BLOCK);
    workNoteStyle.minWidth = 500;
    workNoteStyle.minHeight = 200;
    workNoteStyle.backgroundColor = new parsegraph_Color(.9, 1, 1);

    var car = new parsegraph_Caret('bu');
    car.shrink();

    var isWorkday = weekday!=="Sunday"&&weekday!=="Saturday";
    for(var h=0; h < 24; ++h) {
        if(h > 0) {
            car.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
        }
        car.spawnMove(parsegraph_BACKWARD, futureStyleName);
        switch(h) {
        case 0:
            car.label("Midnight");
            break;
        case 12:
            car.label("Noon");
            break;
        default:
            car.label(((h%12)) + (h > 12 ? "PM" : "AM"));
        }
        if(d && parsegraph_datesEqual(d, currentDate)) {
            if(h < currentDate.getHours()) {
                car.replace(pastStyleName);
            }
        }
        else if(d && !parsegraph_dateGreater(d, currentDate)) {
            car.replace(pastStyleName);
        }
        car.move('f');
        car.spawnMove('f', 's');
        car.node().setBlockStyle((isWorkday && h >= 9 && h < 17) ? workNoteStyle : noteStyle);
        if(typeof noteFunc === "function") {
            car.label(noteFunc.call(noteFuncThisArg, h));
        }
        else {
            car.label("");
        }
        car.node().realLabel().setEditable(true);
        if(onUpdateNote) {
            car.node().realLabel().onTextChanged(function() {
                onUpdateNote.call(onUpdateNoteThisArg, d, this.value(), this.realLabel().text());
            }, car.node());
            car.node().setValue(h);
        }
        if(d && parsegraph_datesEqual(d, currentDate)) {
            if(h < currentDate.getHours()) {
                car.node().setBlockStyle(pastNoteStyle);
            }
        }
        car.move('b');
    }
    car.moveToRoot();
    return car.root();
};

parsegraph_CalendarWidget.prototype.noteID = function(d, h)
{
    return "CalendarWidget-"+parsegraph_outputDate(d, true, false, false) + "@"+h;
};

parsegraph_CalendarWidget.prototype.updateNote = function(d, h, note)
{
    //console.log(d + " " + note);
    localStorage.setItem(this.noteID(d, h), note);
    //console.log(this.noteID(d, h));
};

parsegraph_CalendarWidget.prototype.getNote = function(d, h)
{
    var rv = localStorage.getItem(this.noteID(d, h));
    if(rv === null) {
        return "";
    }
    return rv;
};

function parsegraph_CalendarWidget()
{
}

parsegraph_CalendarWidget.prototype.pastStyleName = function()
{
    return "slot";
};

parsegraph_CalendarWidget.prototype.futureStyleName = function()
{
    return "block";
};

parsegraph_CalendarWidget.prototype.createWeek = function(d, currentDate, firstWeekOfYear, lastWeekOfYear)
{
    var caret = new parsegraph_Caret(parsegraph_BUD);

    if(firstWeekOfYear && lastWeekOfYear) {
        throw new Error("A week cannot be both the first and the last week of the same year.");
    }

    // Spawn empty blocks to reach the date.
    if(firstWeekOfYear && (d.getDate() !== 1 && d.getMonth() !== 0)) {
        var y = d.getFullYear();
        while(y === d.getFullYear()) {
            caret.spawnMove('f', (d.getFullYear() + 1) <= currentDate.getFullYear() ? this.pastStyleName() : this.futureStyleName());
            d = parsegraph_nextDay(d);
        }
    }

    var dayNames = parsegraph_getListOfDays();
    var monthNames = parsegraph_getListOfMonths();

    var year = d.getFullYear();

    var weekLabel = "";
    var thisMonth = -1;
    do {
        // Show another day.
        caret.spawnMove('f', this.pastStyleName());

        if(!lastWeekOfYear || d.getFullYear() === year) {
            if(thisMonth === -1) {
                thisMonth = d.getMonth();
                if(d.getDate() === 1) {
                    weekLabel = parsegraph_outputMonth(d);
                }
            }
            else if(thisMonth !== d.getMonth()) {
                // Changed months.
                weekLabel = parsegraph_outputMonth(d);
            }
        }

        if(parsegraph_dateGreater(d, currentDate)) {
            caret.replace(this.futureStyleName());
        }
        else if(parsegraph_datesEqual(d, currentDate)) {
            var bColor = parsegraph_style(parsegraph_BLOCK).backgroundColor;
            var sColor = parsegraph_style(parsegraph_SLOT).backgroundColor;
        }
        else {
            //console.log(d + " is less than " + currentDate + ", so it stays a block.");
        }

        if(!lastWeekOfYear || d.getFullYear() === year) {
            if(currentDate.getFullYear() === d.getFullYear() && (parsegraph_datesEqual(parsegraph_getFirstDayOfWeek(d), parsegraph_getFirstDayOfWeek(currentDate)) || parsegraph_datesEqual(parsegraph_getFirstDayOfWeek(parsegraph_nextWeek(currentDate)), parsegraph_getFirstDayOfWeek(d)))) {
                //console.log(d.getFullYear() + " " + currentDate.getFullYear());
                caret.label(dayNames[d.getDay()] + ", " + monthNames[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear());
                caret.align('i', 'v');
                caret.connect('i', createDay(d.getDay(), d, currentDate,
                    function(h) { return this.getNote(d, h); }, this, this.updateNote, this));
            }
            else {
                // Label the date block.
                caret.label(d.getDate());
            }
        }

        // Advance to the next day.
        d = parsegraph_nextDay(d);
    }
    while(d.getDay() !== 0);

    caret.moveToRoot();
    caret.shrink('f');

    if(typeof weekLabel === "string" && weekLabel.length > 0) {
        if(d.getFullYear() < currentDate.getFullYear() || (d.getFullYear() === currentDate.getFullYear() && d.getMonth() < currentDate.getMonth())) {
            caret.spawnMove('b', this.pastStyleName());
        }
        else {
            caret.spawnMove('b', this.futureStyleName());
        }
        caret.label(weekLabel);
        caret.move('f');
    }

    return caret.node();
};

parsegraph_CalendarWidget.prototype.createYear = function(year, currentDate)
{
    var caret = new parsegraph_Caret(parsegraph_BUD);

    var d = parsegraph_getFirstDayOfWeek(new Date(year, 0, 1));
    for(var i = 0; i <= 52; ++i) {
        if(d.getFullYear() > year) {
            break;
        }
        if(i === 0) {
            caret.push();
            ["S", 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function(t) {
                caret.spawnMove('f', year <= currentDate.getFullYear() ? this.pastStyleName() : this.futureStyleName());
                caret.label(t);
            }, this);
            caret.pop();
            caret.shrink('f');
        }

        caret.connect(parsegraph_DOWNWARD, this.createWeek(d, currentDate, i===0, i===52));
        caret.move(parsegraph_DOWNWARD);
        if(i === 0) {
            if(!caret.has(parsegraph_BACKWARD)) {
                caret.spawnMove(parsegraph_BACKWARD, year === currentDate.getFullYear() ? parsegraph_BLOCK : parsegraph_SLOT);
            }
            else {
                caret.move(parsegraph_BACKWARD);
            }
            caret.replace(year <= currentDate.getFullYear() ? this.futureStyleName() : this.pastStyleName());
            caret.label("January " + year);
            caret.move(parsegraph_FORWARD);
        }
        d = parsegraph_nextWeek(d);
    }
    caret.moveToRoot();
    return caret.node();
};

parsegraph_CalendarWidget.prototype.createCalendar = function(currentDate, previousYears, nextYears)
{
    if(arguments.length === 1) {
        previousYears = 0;
        nextYears = 0;
    }
    else if(arguments.length === 0) {
        currentDate = new Date();
        previousYears = 0;
        nextYears = 0;
    }

    if(currentDate === undefined) {
        // Use today's date.
        currentDate = new Date();
    }

    var year = currentDate.getFullYear();
    var caret = new parsegraph_Caret(parsegraph_SLOT);
    caret.label(year);
    caret.align('d', 'c');
    caret.connect('d', this.createYear(year, currentDate));
    caret.pull('d');
    //caret.crease();

    caret.push();
    for(var i=1; i <= previousYears; ++i) {
        caret.spawnMove('b', this.pastStyleName());
        caret.pull('d');
        caret.label(year - i);
        caret.align('d', 'c');
        caret.connect('d', this.createYear(year - i, currentDate));
        //caret.crease();
    }
    caret.pop();

    caret.push();
    for(var i=1; i <= nextYears; ++i) {
        caret.spawnMove('f', this.futureStyleName());
        caret.pull('d');
        caret.label(year + i);
        caret.align('d', 'c');
        caret.connect('d', this.createYear(year + i, currentDate));
        //caret.crease();
    }
    caret.pop();

    return caret.root();
};
