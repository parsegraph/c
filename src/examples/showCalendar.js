function showCalendar(startYear, endYear, currentDate)
{
    var createYear = function(year) {
        var caret = new parsegraph_Caret(parsegraph_BUD);

        var d = new Date(year, 0, 1);
        var thisMonth = -1;
        while(d.getFullYear() === year) {
            // Has the date moved to the next month?
            if(d.getMonth() !== thisMonth) {
                if(thisMonth !== -1) {
                    // Close out the month.
                    if(d.getDay() - 1 > 0) {
                        caret.push();
                        for(var j = d.getDay() - 1; j < 6; ++j) {
                            caret.spawnMove('f', 'slot');
                        }
                        caret.pop();
                    }
                    caret.pop();
                    caret.spawnMove('d', 'bud');
                }

                // Show the monthly header.
                caret.spawnMove('f', 'slot');
                caret.label(parsegraph_outputMonth(d));
                thisMonth = d.getMonth();
                caret.move('b');

                // Show the first week, prefixed with last month's days.
                caret.spawnMove('d', 'bud');
                caret.push();
                for(var j = 0; j < d.getDay(); ++j) {
                    caret.spawnMove('f', 'slot');
                }

                // Show the first day.
                caret.spawnMove('f', 'block');
            }
            // Has the date started a new week?
            else if(d.getDay() == 0) {
                // Move and show another week.
                caret.pop();
                caret.spawnMove('d', 'bud');

                caret.push()
                caret.spawnMove('f', 'block');
            }
            else {
                // Show another day.
                caret.spawnMove('f', 'block');
            }
            if(parsegraph_datesEqual(d, currentDate)) {
                // Indicate the current date with a slot.
                caret.select();
            }

            if(parsegraph_dateGreater(d, currentDate)) {
                caret.replace('s');
            }
            else {
                //console.log(d + " is less than " + currentDate);
            }

            // Label the date block.
            caret.label(d.getDate());

            // Advance to the next day.
            d = parsegraph_nextDay(d);
        }

        return caret.root();
    };

    if(currentDate === undefined) {
        // Use today's date.
        currentDate = new Date();
    }

    // Enter the graph.
    var caret = new parsegraph_Caret(parsegraph_BUD);
    caret.spawnMove('f', 'bud');
    for(var year = startYear; year <= endYear; ++year) {
        caret.connect('d', createYear(year));
        caret.crease('d');
        caret.spawnMove('f', 's');
        caret.label(year);
    }
    return caret.root();
}
