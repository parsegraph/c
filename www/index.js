var commands = {};

function buildTextDemo(graph, COUNT, text)
{
    if(COUNT === undefined) {
        COUNT = 10;
    }
    if(text === undefined) {
        text = "";
    }

    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BLOCK);
    caret.node().setLabel("Rainback.");

    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD, parsegraph_ALIGN_CENTER);
    caret.move(parsegraph_DOWNWARD);
    caret.shrink();
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.pull(parsegraph_DOWNWARD);

    var i = 0;
    var addBlock = function() {
        if(i % 2 === 0) {
            caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BLOCK);
        }
        else {
            caret.spawnMove(parsegraph_DOWNWARD, parsegraph_SLOT);
        }
        caret.node().setLabel(text + " " + i);
        caret.move(parsegraph_UPWARD);

        caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);

        graph.scheduleRepaint();
        ++i
    };

    for(var j = 0; j < COUNT; ++j) {
        addBlock();
    }

    var scheduleAddBlock = function() {
        addBlock();
        window.setTimeout(scheduleAddBlock, 1000);
    };
    //scheduleAddBlock();

    return caret;
};

function buildSelection(graph, COUNT)
{
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.push();

    var d = parsegraph_FORWARD;
    for(var i = 0; i < COUNT; ++i) {
        if(i % 3 == 0) {
            caret.spawn(d, parsegraph_BLOCK);
        }
        else if(i % 2 == 0) {
            caret.spawn(d, parsegraph_SLOT);
        }
        else {
            caret.spawn(d, parsegraph_BUD);
        }
        caret.label(i);
        if(i % 2 == 0) {
            caret.select();
        }
        caret.move(d);
        caret.shrink()
        d = parsegraph_turnLeft(d);
    }
    caret.pop();

    var addBlock = function() {
        graph.scheduleRepaint();

        caret.moveToRoot();
        var d = parsegraph_FORWARD;
        for(var i = 0; i < COUNT; ++i) {
            if(caret.selected()) {
                caret.deselect();
            }
            else {
                caret.select();
            }
            caret.move(d);
            d = parsegraph_turnLeft(d);
        }
    };

    var scheduleAddBlock = function() {
        addBlock();
        window.setTimeout(scheduleAddBlock, 1000);
    };
    scheduleAddBlock();

    return caret;
}

function buildPrimesDemo(graph, COUNT)
{
    if(COUNT == undefined) {
        COUNT = 50;
    }
    COUNT = Math.min(COUNT, 100);

    parsegraph_HORIZONTAL_SEPARATION_PADDING = 1;
    parsegraph_VERTICAL_SEPARATION_PADDING = 1;
    parsegraph_MIN_BLOCK_HEIGHT = parsegraph_MIN_BLOCK_WIDTH;

    function makeModulo(frequency) {
        var target = 0;

        var object = {};

        object.calculate = function(number) {
            while(number > target) {
                target += frequency;
            }
            return target - number;
        };

        object.value = function() {
            return frequency;
        };

        return object;
    };

    var knownPrimes = [];
    var candidate = 2;

    var startTime = parsegraph_getTimeInMillis();

    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
    var addBlock = function() {
        caret.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
        caret.label(candidate);
        caret.push();
        var isPrime = true;
        for(var i = 0; i < knownPrimes.length; ++i) {
            var prime = knownPrimes[i];
            modulus = prime.calculate(candidate);
            if(modulus == 0) {
                // It's a multiple, so there's no chance for primality.
                caret.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
                isPrime = false;
            }
            else {
                caret.spawnMove(parsegraph_UPWARD, parsegraph_SLOT);
            }
        }

        if(isPrime) {
            caret.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
            caret.label(candidate);
            // The candidate is prime, so output it and add it to the list.
            knownPrimes.push(makeModulo(candidate));
        }

        caret.pop();
        ++candidate;
    };

    /*caret.push();
    for(var i = 0; i < knownPrimes.length; ++i) {
        caret.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
    }
    caret.pop();*/

    //console.log(parsegraph_getTimeInMillis() - startTime);

    var scheduleAddBlock = function() {
        if(knownPrimes.length > COUNT) {
            // Completed.
            return;
        }
        for(var i = 0; i < 10; ++i) {
            addBlock();
            if(knownPrimes.length > COUNT) {
                // Completed.
                break;
            }
        }
        graph.scheduleRepaint();
        window.setTimeout(scheduleAddBlock, 500);
    };
    scheduleAddBlock();

    return caret;
}

function showStatements(graph)
{
    var wordDir = parsegraph_FORWARD;
    var lineDir = parsegraph_DOWNWARD;

    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.fitExact();

    caret.spawn(parsegraph_reverseNodeDirection(lineDir), parsegraph_BUD);
    caret.pull(wordDir);
    caret.push();

    var operator = function(name)
    {
        caret.spawnMove(wordDir, parsegraph_BUD);
        caret.label(name);
    };

    var statement = function(name)
    {
        caret.spawnMove(wordDir, parsegraph_BLOCK);
        caret.label(name);
    };

    var nextLine = function()
    {
        caret.pop();
        caret.spawnMove(lineDir, parsegraph_BUD);
        caret.pull(wordDir);
        caret.push();
    };

    statement("letter");
    operator("=");
    statement('"A"');
    operator("|");
    statement('"B"');


    caret.push();
    caret.align(parsegraph_DOWNWARD, parsegraph_ALIGN_CENTER);

    caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BLOCK);
    caret.label('"A"');
    caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    caret.label("<=|=>");
    caret.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
    caret.label('"B"');
    caret.pop();
    nextLine();

    statement("012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789");
    statement("mainappendChild is the longest statement ever written in Rainback by humans.");
    nextLine();

    statement("main");
    operator(".");
    statement("append");
    statement("graph");
    operator(".");
    statement("_container");
    nextLine();

    return caret;
}

function showHardTest(graph, server)
{
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.replace('block');

    caret.label("No time.");
    caret.spawn('u', 'bud');
    caret.spawn('b', 'bud');
    caret.spawn('f', 'bud');
    caret.spawn('i', 'slot', 'v');
    caret.move('i');
    caret.label("value");
    caret.move('o');

    caret.spawnMove('d', 's');
    caret.label('System.IO.Stream');
    caret.shrink();
    caret.push();
    caret.spawnMove('i', 'block', 'v');
    caret.shrink();
    caret.label('"A"');
    caret.spawnMove('f', 'bud');
    caret.label("|");
    caret.shrink();
    caret.spawnMove('f', 'block');
    caret.label('"B"');
    caret.spawnMove('f', 'bud');
    caret.label("|");
    caret.shrink();
    caret.spawnMove('f', 'block');
    caret.label('"C"');
    caret.pop();

    caret.moveToRoot();
    caret.move('u');
    caret.spawnMove('f', 'block');
    caret.label("Create user");
    var letterID = caret.save();
    caret.spawnMove('i', 'slot', 'v');
    var username = "test" + Math.floor(50 * Math.random());

    caret.label(username);
    caret.spawnMove('f', 'slot');
    caret.label("*****");

    server.createUser(username, "secret" + username + Math.floor(4096 * Math.random()), function(response) {
        caret.moveTo(letterID);
        caret.spawnMove('d', 'bud');
        caret.shrink();

        var i = 0;
        for(var key in response) {
            var value = response[key];
            caret.push();
            caret.spawnMove('f', 'slot');
            caret.label(key);
            caret.spawnMove('i', 'block');
            caret.label(value);
            caret.pop();
            caret.spawnMove('d', 'bud');
        }

        graph.scheduleRepaint();
    }, this);

    return caret;
}

/**
 * Shows a bunch of branches that demonstrate how buds and blocks align. It's
 * also a good demonstration of what pull does. It's also a good stress test
 * for user input.
 *
 * Presently, COUNT cannot be more than 100. It defaults to 10.
 */
function showProportionTest(graph, COUNT)
{
    if(COUNT === undefined) {
        COUNT = 10;
    }
    COUNT = Math.min(COUNT, 100);

    var caret = new parsegraph_Caret(graph, parsegraph_BUD);

    caret.fitExact();

    for(var i = 0; i < COUNT; ++i) {
        var spawnRow = function(dir) {
            caret.push();
            caret.spawnMove(dir, 'bud');
            for(var j = 0; j < COUNT - i - 1; ++j) {
                caret.spawnMove('d', 'bud');
            }
            caret.spawnMove('d', 'block');
            caret.label(COUNT - i);
            caret.pop();
        };
        spawnRow('b');
        spawnRow('f');

        caret.pull('d');
        caret.spawnMove('d', 'slot');
    }

    caret.moveToRoot();
    caret.spawnMove('u', 'bud');
    caret.spawn('b', 'bud');
    caret.spawn('f', 'bud');

    return caret;
}

function showMemoryBlocks(graph, COUNT)
{
    var caret = new parsegraph_Caret(graph, parsegraph_BUD);

    // Enter.
    caret.fitLoose();
    caret.spawnMove('f', 'bud');

    // Build NUM_COLUMNS columns, comprised of some additional horizontal
    // nodes depending on position.
    var NUM_COLUMNS = COUNT;
    for(var i = 0; i < NUM_COLUMNS; ++i) {
        caret.push();

        // Build the column
        var COLUMN_LENGTH = NUM_COLUMNS;
        for(var j = 0; j < COLUMN_LENGTH; ++j) {
            var r = Math.floor(Math.random() * 4);
            if(r % 4 == 0) {
                if(i % 2 == 0) {
                    caret.spawnMove('d', 'slot');
                }
                else {
                    caret.spawnMove('u', 'slot');
                }
            }
            else {
                if(i % 2 == 0) {
                    caret.spawnMove('d', 'slot');
                }
                else {
                    caret.spawnMove('u', 'slot');
                }
            }
            r = Math.floor(Math.random() * 2);
            if(r % 2 == 0) {
                caret.spawn('b', 'block');
            }
            r = Math.floor(Math.random() * 2);
            if(r % 2 == 0) {
                caret.spawn('f', 'block');
            }
        }

        if(!caret.has('f')) {
            caret.spawnMove('f', 'bud');
            caret.spawn('f', 'bud');
            caret.move('b');
        }
        if(!caret.has('b')) {
            caret.spawnMove('b', 'bud');
            caret.spawn('b', 'bud');
            caret.move('f');
        }

        caret.pop();

        // Spawn a bud, if we need to.
        if(i < NUM_COLUMNS) {
            caret.spawnMove('f', 'bud');
        }
    }

    return caret;
}

function showSpiral(graph, COUNT)
{
    if(COUNT === undefined) {
        COUNT = 25;
    }

    COUNT = Math.min(100, COUNT);

    // Enter
    var spawnDir = parsegraph_FORWARD;
    var spiralType = parsegraph_BUD;

    var caret = new parsegraph_Caret(graph, spiralType);
    caret.spawnMove(spawnDir, spiralType);

    caret.push();
    for(var i = COUNT; i >= 2; --i) {
        for(var j = 1; j < 2; ++j) {
            caret.spawnMove(spawnDir, spiralType);
        }
        spawnDir = parsegraph_turnLeft(spawnDir);
    }
    caret.pop();

    return caret;
}

function showFunction(graph, COUNT)
{
    if(COUNT === undefined) {
        COUNT = 50;
    }

    // Enter.
    var caret = new parsegraph_Caret(graph, parsegraph_BUD);
    caret.spawnMove('f', 'bud');

    // HOIRZONTAL_STEPS is the number of times the function is evaluated
    var HORIZONTAL_STEPS = COUNT;

    // VERTICAL_SIZE is the number of blocks used to display ranges.
    var VERTICAL_SIZE = COUNT;

    // RANGE_START is the minimum range value displayed.
    var RANGE_START = -2;

    // RANGE_END is the maximum range value displayed.
    var RANGE_END = 2;

    // DOMAIN_START is the minimum domain value used.
    var DOMAIN_START = -2 * 3.14159;

    // DOMAIN_END is the maximum domain value used.
    var DOMAIN_END = 2 * 3.14159;

    var pos = DOMAIN_START;
    var increment = (DOMAIN_END - DOMAIN_START) / HORIZONTAL_STEPS;
    for(var i = 0; i < HORIZONTAL_STEPS; ++i) {
        var result = Math.sin(pos);

        var colSize = 0;
        if(result < RANGE_START) {
            colSize = -VERTICAL_SIZE;
        }
        else if(result > RANGE_END) {
            colSize = VERTICAL_SIZE;
        }
        else {
            var interpolated =
                (result - RANGE_START) / (RANGE_END - RANGE_START);
            colSize = Math.floor(interpolated * VERTICAL_SIZE);
        }

        caret.push();
        for(var j=0; j < Math.abs(colSize); ++j) {
            if(colSize > 0) {
                caret.spawnMove('u', 'bud');
            }
            else {
                caret.spawnMove('d', 'bud');
            }
            if(j == Math.abs(colSize) - 1) {
                caret.replace('block');
                caret.label(i);
            }
        }
        if(Math.abs(colSize) == 0) {
            caret.replace('block');
            caret.label(i);
        }
        caret.pop();

        pos = pos + increment;
        caret.spawnMove('f', 'bud');
    }

    return caret;
}

function showCalendar(graph, currentDate)
{
    if(currentDate === undefined) {
        // Use today's date.
        currentDate = new Date();
    }

    // Enter the graph.
    var caret = new parsegraph_Caret(graph, parsegraph_BUD);
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

    return caret;
}

function showUlam(graph, COUNT)
{
    if(COUNT === undefined) {
        COUNT = 35;
    }
    COUNT = Math.min(100, COUNT);

    var ROWS = COUNT;

    var total = 0;
    for(var i = ROWS; i >= 2; --i) {
        for(var j=1; j <= i - 1; ++j) {
            ++total;
        }
        for(var j=1; j <= i - 1; ++j) {
            ++total;
        }
    }

    var MAX_CANDIDATE = total;

    function makeModulo(frequency) {
        var target = 0;

        var object = {};

        object.calculate = function(number) {
            while(number > target) {
                target += frequency;
            }
            return target - number;
        };

        object.value = function() {
            return frequency;
        };

        return object;
    };

    var knownPrimes = [];
    var primeMap = {};
    primeMap[1] = true;

    var candidate = 2;

    while(true) {
        var isPrime = true;
        for(var i = 0; i < knownPrimes.length; ++i) {
            var prime = knownPrimes[i];
            modulus = prime.calculate(candidate);
            if(modulus == 0) {
                // It's a multiple, so there's no chance for primality.
                isPrime = false;
            }
        }

        if(isPrime) {
            // The candidate is prime, so output it and add it to the list.
            knownPrimes.push(makeModulo(candidate));
            primeMap[candidate] = true;
        }

        ++candidate;

        if(candidate > MAX_CANDIDATE) {
            break;
        }
    }

    // Enter
    var spawnDir = parsegraph_FORWARD;
    var spiralType = parsegraph_BLOCK;

    var caret = new parsegraph_Caret(graph, spiralType);
    caret.fitExact();
    caret.push();

    /*for i=1, 10 do
        spawnDir = parsegraph.turnLeft(spawnDir);
        for j=1, i do
            caret.pull(spawnDir);
            caret.spawnMove(spawnDir, spiralType);
        end;
        spawnDir = parsegraph.turnLeft(spawnDir);
        for j=1, i do
            caret.pull(spawnDir);
            caret.spawnMove(spawnDir, spiralType);
        end;
    end;*/

    var count = 0;
    var nextType = function() {
        if(total - count in primeMap) {
            ++count;
            return parsegraph_BLOCK;
        };
        ++count;
        return parsegraph_SLOT;
    };

    for(var i = ROWS; i >= 2; --i) {
        spawnDir = parsegraph_turnRight(spawnDir);
        //caret.pull(spawnDir);
        for(var j = 1; j <= i - 1; ++j) {
            //caret.pull(spawnDir);
            caret.spawnMove(spawnDir, nextType());
            caret.label(total - count + 1);
        }
        spawnDir = parsegraph_turnRight(spawnDir);
        //caret.pull(spawnDir);
        for(var j=1; j <= i-1; ++j) {
            //caret.pull(spawnDir);
            caret.spawnMove(spawnDir, nextType());
            caret.label(total - count + 1);
        }
    }

    caret.pop();

    return caret;
}

function showIPAddresses(graph)
{
    var COUNT = 2;
    COUNT = Math.max(2, COUNT);
    var MAX_DEPTH = 9;

    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    function showLevel(depth, index) {
        if(depth === undefined) {
            depth = 0;
        }
        if(index === undefined) {
            index = 0;
        }
        var calc = Math.pow(COUNT, depth - 1) + index;
        if(depth === MAX_DEPTH) {
            // Just spawn a block.
            caret.spawnMove('d', 'block');
            //caret.label("Index=" + index + ", depth=" + depth + ", calc=" + calc);
            caret.label(index);

            // Indicate that we are a leaf.
            return false;
        }

        for(var i = 0; i < COUNT; ++i) {
            if(i === 0) {
                caret.spawnMove('d', 'bud', parsegraph_ALIGN_CENTER);
                caret.pull('d');
                caret.push();
            }
            else {
                caret.spawnMove('f', 'bud');
            }
            if(showLevel(depth + 1, i)) {
                caret.replace('u', 'block');
                //caret.label('u', "Index=" + index + ", i=" + i + ", depth=" + depth + ", calc=" + calc);
                caret.label(index);
            }
            caret.shrink();
            caret.move('u');
        }
        caret.pop();

        // Indicate that we are not a leaf.
        return true;
    };
    showLevel();

    return caret;
}

function showCorporateStructure(graph)
{
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.label("Shareholders");

    // Show the board
    caret.spawnMove('d', 'b');
    caret.label("Board of Directors");
    caret.push();
    caret.spawnMove('i', 's', 'v');
    caret.shrink();

    // First, the chairman.
    caret.spawnMove('i', 'b', 'v');
    caret.shrink();
    caret.label("Chairman");
    caret.spawn('i', 's', 'v');

    // Show the board members.
    for(var i = 0; i < 8; ++i) {
        if(i == 0) {
            caret.spawnMove('d', 'bu', parsegraph_ALIGN_CENTER);
            caret.shrink();
        }
        else {
            caret.spawnMove('f', 'bu');
        }
        caret.pull('d');
        caret.spawnMove('d', 'b');
        caret.label("Board Member");
        caret.spawn('i', 's', 'v');
        caret.move('u');
    }
    caret.pop();

    // C-level management.
    caret.spawnMove('d', 'b');
    caret.label("C-level Management");
    caret.push();
    caret.spawnMove('i', 's', 'v');
    caret.shrink();

    // CEO.
    caret.spawnMove('i', 'b', 'v');
    caret.label("CEO");
    caret.shrink();
    caret.spawn('i', 'slot', 'v');

    // C-level officers.
    [
        "CFO; Finances",
        "CMO; Marketing",
        "CTO; Technology",
        "CIO; Information",
        "CSO; Security",
        "COO; Operations",
        "CHRO; Human Resources",
        "CXO; User Experience",
        "Chief Attorney; Legal",
        "Chief Inspector; Auditing"
    ].forEach(function(executive, i) {
        if(i == 0) {
            caret.spawnMove('d', 'bu', parsegraph_ALIGN_CENTER);
            caret.shrink();
        }
        else {
            caret.spawnMove('f', 'bu');
        }
        caret.pull('d');
        caret.spawnMove('d', 'b');
        caret.label(executive);
        caret.spawn('i', 's', 'v');
        caret.move('u');
    });
    caret.pop();

    // Sectors.
    [
        "Agriculture, Forestry, Fishing and Hunting",
        "Mining, Quarrying, and Oil and Gas Extraction",
        "Utilities",
        "Construction",
        "Manufacturing",
        "Wholesale Trade",
        "Retail Trade",
        "Transportation and Warehousing",
        "Information",
        "Finance and Insurance",
        "Real Estate and Rental and Leasing",
        "Professional, Scientific, and Technical Services",
        "Management of Companies and Enterprises",
        "Administrative and Support and Waste Management and Remediation Services",
        "Educational Services",
        "Health Care and Social Assistance",
        "Arts, Entertainment, and Recreation",
        "Accommodation and Food Services",
        "Other Services (except Public Administration)",
        "Public Administration"
    ].forEach(function(sector, i) {
        if(i == 0) {
            caret.spawnMove('d', 'bud', parsegraph_ALIGN_CENTER);
            caret.shrink();
        }
        else {
            caret.spawnMove('f', 'bud');
        }
        caret.push();
        caret.pull('d');
        caret.spawnMove('d', 'block');
        caret.label(sector);
        caret.spawnMove('i', 's', 'v');
        caret.shrink();

        caret.spawnMove('i', 'block');
        caret.label("Sector President");
        caret.spawn('i', 's', 'v');

        [
            "United States",
            "Euro Area",
            "Japan",
            "East Asia and Pacific",
            "Europe and Central Asia",
            "Latin America and the Carribean",
            "Middle East and North Africa",
            "South Asia",
            "Sub-Saharan Africa"
        ].forEach(function(region, j) {
            if(j == 0) {
                caret.spawnMove('d', 'bud');
                caret.shrink();
            }
            else {
                caret.spawnMove('d', 'bud');
            }
            caret.pull('f');
            caret.push();
            caret.spawnMove('f', 'block');
            caret.label("VP, " + region);
            caret.spawn('i', 's', 'v');

            [
                "Administrative",
                "Operations",
                "Engineering",
                "Sales",
                "Media"
            ].forEach(function(division, k) {
                if(k == 0) {
                    caret.spawnMove('d', 'bu', parsegraph_ALIGN_CENTER);
                    caret.shrink();
                }
                else {
                    caret.spawnMove('f', 'bu');
                }
                caret.pull('d');
                caret.push();
                caret.spawnMove('d', 'block');
                caret.label(division + " Director");
                caret.spawn('i', 's', 'v');
                caret.shrink();
                caret.pop();
            });

            caret.pop();
        });

        caret.pop();
    });

    return caret;
}

function createSliderDemo(graph)
{
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.fitExact();
    caret.label("Slider");
    caret.spawnMove('d', 'slider');
    caret.label(3);
    caret.move('u');
    caret.spawnMove('f', 'block');
    caret.label("Scene");
    caret.spawn('d', 'scene');
    return caret;
}

function init()
{
    parsegraph_initialize();

    var server = new parsegraph_CommandClient("./server.fcgi");
    parsegraph_addUserCommands(server);

    var main = document.body;
    var graph = new parsegraph_Graph(parsegraph_SLOT);
    GRAPH = graph;

    var COUNT = 25
    //graph.plot(showCorporateStructure(graph));
    //graph.plot(buildPrimesDemo(graph, COUNT));
    //graph.plot(buildTextDemo(graph, COUNT, "繁"));
    //graph.plot(showMemoryBlocks(graph, COUNT));
    //graph.plot(showSpiral(graph));
    //graph.plot(showFunction(graph));
    //graph.plot(showCalendar(graph));
    //graph.plot(showUlam(graph, COUNT));
    //graph.plot(createSliderDemo(graph));

    // Look at alignment here first.
    //graph.plot(showHardTest(graph, server));
    //graph.plot(showStatements(graph));

    // Then correct alignment here.
    graph.plot(showProportionTest(graph, COUNT));

    //graph.plot(showIPAddresses(graph));

    main.appendChild(graph.container());

    if(localStorage.getItem("cameraX") != null) {
        graph.camera().setOrigin(
            Number(localStorage.getItem("cameraX")),
            Number(localStorage.getItem("cameraY"))
        );
        graph.camera().setScale(Number(localStorage.getItem("scale")));
    }

    var cameraInfo = document.createElement("p");

    graph.afterRender = function() {
        localStorage.setItem("cameraX", graph.camera().x());
        localStorage.setItem("cameraY", graph.camera().y());
        localStorage.setItem("scale", graph.camera().scale());

        cameraInfo.innerHTML = "Camera (" + graph.camera().x() + ", " + graph.camera().y() + "), scale=" + graph.camera().scale();

        if(graph._nodePainter._spotlightPainter.hasSpotlights()) {
            graph.surface().scheduleRender();
        }
    };

    var controls = document.createElement("div");
    controls.className = "controls";
    main.appendChild(controls);
    controls.style.bottom = "0";

    var form = parsegraph_createForm();
    form.button("resetOrigin", "Reset Camera");
    form.checkbox("RenderBlocks", graph._nodePainter.isBlockRenderingEnabled());
    form.label("RenderBlocks", "Render blocks");
    form.checkbox("RenderExtents", graph._nodePainter.isExtentRenderingEnabled());
    form.label("RenderExtents", "Render extents");
    form.checkbox("RenderOrigin", graph._nodePainter.isOriginRenderingEnabled());
    form.label("RenderOrigin", "Render origin");
    form.checkbox("RenderSpotlight", graph._nodePainter.isSpotlightRenderingEnabled());
    form.label("RenderSpotlight", "Render spotlights");
    form.checkbox("RenderText", graph._nodePainter.isTextRenderingEnabled());
    form.label("RenderText", "Render text");
    form.button("showGlyphAtlas", "Show glyph atlas");

    var glyphAltasContainer;

    form.addListener(function(sourceName, value) {
        if(sourceName == "resetOrigin") {
            graph.camera().setOrigin(
                graph._gl.drawingBufferWidth / 2,
                graph._gl.drawingBufferHeight / 2
            );
            graph.camera().setScale(1);
        }
        else if(sourceName == "RenderBlocks") {
            if(value) {
                graph._nodePainter.enableBlockRendering();
            }
            else {
                graph._nodePainter.disableBlockRendering();
            }
        }
        else if(sourceName == "RenderLines") {
            if(value) {
                graph._nodePainter.enableLineRendering();
            }
            else {
                graph._nodePainter.disableLineRendering();
            }
        }
        else if(sourceName == "RenderExtents") {
            if(value) {
                graph._nodePainter.enableExtentRendering();
            }
            else {
                graph._nodePainter.disableExtentRendering();
            }
        }
        else if(sourceName == "RenderSpotlight") {
            if(value) {
                graph._nodePainter.enableSpotlightRendering();
            }
            else {
                graph._nodePainter.disableSpotlightRendering();
            }
        }
        else if(sourceName == "RenderOrigin") {
            if(value) {
                graph._nodePainter.enableOriginRendering();
            }
            else {
                graph._nodePainter.disableOriginRendering();
            }
        }
        else if(sourceName == "RenderText") {
            if(value) {
                graph._nodePainter.enableTextRendering();
            }
            else {
                graph._nodePainter.disableTextRendering();
            }
        }
        else if(sourceName == "showGlyphAtlas") {
            graph._nodePainter._textPainter._glyphAtlas.canvas().style.display = "";
        }
        else {
            return;
        }

        graph.surface().scheduleRender();
    });

    controls.appendChild(form.asDOM());
    controls.appendChild(cameraInfo);
    main.appendChild(document.createElement("div"));
    main.lastChild.appendChild(graph._nodePainter._textPainter._glyphAtlas.canvas());
    main.lastChild.lastChild.style.display = "none";
    parsegraph_addButtonListener(main.lastChild, function() {
        main.lastChild.lastChild.style.display = "none";
    });
    var glyphAltasContainer = main.lastChild;
}
