function showCalendar(currentDate)
{
    if(currentDate === undefined) {
        // Use today's date.
        currentDate = new Date();
    }

    // Enter the graph.
    var caret = new parsegraph_Caret(parsegraph_BUD);
    caret.spawnMove('f', 'bud');
    caret.push();

    var d = new Date(currentDate.getTime());
    d.setDate(1);

    // Show a full year's worth of days.
    var thisMonth = -1;
    for(var i = 0; i < 365; ++i) {
        // Has the date moved to the next month?
        if(d.getMonth() != thisMonth) {
            // Close out the month.
            if(i > 0) {
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
            else {
                caret.pop();
            }
            // Show the monthly header.
            caret.spawnMove('d', 'bud');
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

        // Label the date block.
        caret.label(d.getDate());

        // Advance to the next day.
        d = parsegraph_nextDay(d);
    }
    caret.pop();

    return caret.root();
}
