function showCorporateStructure(graph)
{
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
    caret.label("Shareholders");

    // Show the board
    caret.spawnMove('d', 'b');
    caret.node().setIgnoreMouse(true);
    caret.label("Board of Directors");
    caret.push();
    caret.spawnMove('i', 's', 'v');
    caret.node().setIgnoreMouse(true);
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
    caret.node().setIgnoreMouse(true);
    caret.label("C-level Management");
    caret.push();
    caret.spawnMove('i', 's', 'v');
    caret.node().setIgnoreMouse(true);
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
            caret.crease();
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
        caret.node().setIgnoreMouse(true);
        caret.label(sector);
        caret.spawnMove('i', 's', 'v');
        caret.crease();
        caret.shrink();
        caret.node().setIgnoreMouse(true);

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
                caret.crease();
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
                    caret.crease();
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

    return caret.root();
}
