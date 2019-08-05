function parsegraph_ChessWidget(app)
{
    this._app = app;
}

var whiteStyle;
var blackstyle;
var emptyStyle;
function updateStyle() {
    if(whiteStyle) {
        return;
    }
    whiteStyle = parsegraph_copyStyle('b');
    blackStyle = parsegraph_copyStyle('s');
    whiteStyle.minWidth = 400;
    blackStyle.minWidth = 400;
    whiteStyle.minHeight = 400;
    blackStyle.minHeight = 400;
    whiteStyle.verticalSeparation = 0;
    blackStyle.verticalSeparation = 0;

    emptyStyle = parsegraph_copyStyle('b');
    emptyStyle.minWidth = 200;
    emptyStyle.minHeight = 200;
    emptyStyle.backgroundColor = new parsegraph_Color(.9,.9,0);

    whitePieceStyle = parsegraph_copyStyle('b');
    whitePieceStyle.backgroundColor = new parsegraph_Color(1, 1, 1, 1);

    blackPieceStyle = parsegraph_copyStyle('s');
    blackPieceStyle.backgroundColor = new parsegraph_Color(0, 0, 0, 1);
    blackPieceStyle.fontColor = new parsegraph_Color(1, 1, 1, 1);
    whitePieceStyle.minWidth = 200;
    blackPieceStyle.minWidth = 200;
    whitePieceStyle.minHeight = 200;
    blackPieceStyle.minHeight = 200;

    whitePieceStyle.fontSize = blackPieceStyle.fontSize = 3*parsegraph_FONT_SIZE;

    budPiece = parsegraph_copyStyle('u');
    budPiece.horizontalSeparation = 0;
};

parsegraph_ChessWidget.prototype.node = function() {
    updateStyle();
    if(!this._containerNode) {
        this._squares = [];
        var car = new parsegraph_Caret('u');
        car.fitExact();
        car.setGlyphAtlas(this._app.glyphAtlas());
        this._containerNode = car.root();
        var fs = "abcdefgh";
        var rs = "12345678";
        for(var f = 1; f <= 8; ++f) {
            car.spawnMove('f', 'u');
            car.node().setBlockStyle(budPiece);
            car.push();
            for(var r = 1; r<=8;++r) {
                car.spawnMove('u', 'b');
                car.label(fs.charAt(f-1) + rs.charAt(r-1));
                car.node().setBlockStyle(r % 2 == f % 2 ? blackStyle : whiteStyle);
                this._squares[8*(f-1)+r-1] = {
                    node:car.node(),
                    piece:null,
                    position:8*(f-1)+r-1,
                    name:fs.charAt(f-1)+rs.charAt(r-1)
                };
                SQUARES = this._squares;

                var makePossible = function(node) {
                    node.setBlockStyle(r <= 2 ? whitePieceStyle : blackPieceStyle);
                };

                var makePiece = function(name) {
                    car.spawnMove('i', 'u', 'v');
                    car.node().setBlockStyle(r <= 2 ? whitePieceStyle : blackPieceStyle);
                    var lname = name;
                    switch(name) {
                    case "King": lname = "♔"; break;
                    case "Queen": lname = "♕"; break;
                    case "Bishop": lname = "♗"; break;
                    case "Knight": lname = "♘"; break;
                    case "Rook": lname = "♖"; break;
                    case "Pawn": lname = "♙"; break;
                    }
                    car.label(lname);
                    this._squares[8*(f-1)+r-1].piece = {
                        node:car.node(),
                        type:name,
                        side:r <= 2 ? 1 : -1
                    };
                    switch(name) {
                    case "King":
                    car.push();
                    makePossible(car.spawnMove('f', 'b'));
                    makePossible(car.spawn('u', 'b'));
                    makePossible(car.spawn('d', 'b'));
                    car.move('b');
                    makePossible(car.spawn('d', 'b'));
                    makePossible(car.spawnMove('b', 'b'));
                    makePossible(car.spawn('u', 'b'));
                    makePossible(car.spawn('d', 'b'));
                    car.move('f');
                    makePossible(car.spawn('u', 'b'));
                    car.pop();
                    break;
                    case "Pawn":
                    car.push();
                    if(r <= 2) {
                        makePossible(car.spawnMove('u', 'b'));
                        makePossible(car.spawnMove('u', 'b'));
                    }
                    else {
                        makePossible(car.spawnMove('d', 'b'));
                        makePossible(car.spawnMove('d', 'b'));
                    }
                    car.pop();
                    break;
                    case "Rook":
                    car.push()
                    for(var i = 0; i < 4; ++i) {
                        makePossible(car.spawnMove('u', 'b'));
                    }
                    car.pop();
                    car.push()
                    for(var i = 0; i < 4; ++i) {
                        makePossible(car.spawnMove('d','b'));
                    }
                    car.pop();
                    car.push()
                    for(var i = 0; i < 4; ++i) {
                        makePossible(car.spawnMove('f','b'));
                    }
                    car.pop();
                    car.push()
                    for(var i = 0; i < 4; ++i) {
                        makePossible(car.spawnMove('b','b'));
                    }
                    car.pop();
                    break;
                    case "Queen":
                    car.push();
                    makePossible(car.spawnMove('f', 'b'));
                    car.push();
                    for(var i = 0; i < 4; ++i) {
                        makePossible(car.spawnMove('f', 'b'));
                    }
                    car.pop();
                    car.push();
                    makePossible(car.spawnMove('u', 'b'));
                    for(var i = 0; i < 4; ++i) {
                        car.spawnMove('u', 'b');
                        makePossible(car.spawnMove('f', 'b'));
                    }
                    car.pop();
                    makePossible(car.spawnMove('d', 'b'));
                    car.push();
                    for(var i=0;i<4;++i) {
                        car.spawnMove('d', 'b');
                        makePossible(car.spawnMove('f', 'b'));
                    }
                    car.pop();
                    car.move('u');
                    car.move('b');
                    makePossible(car.spawnMove('d', 'b'));
                    car.push();
                    for(var i = 0; i < 4; ++i) {
                        makePossible(car.spawnMove('d', 'b'));
                    }
                    car.pop();
                    car.move('u');
                    makePossible(car.spawnMove('b', 'b'));
                    car.push();
                    for(var i = 0; i < 4; ++i) {
                        makePossible(car.spawnMove('b', 'b'));
                    }
                    car.pop();
                    makePossible(car.spawnMove('u', 'b'));
                    car.push();
                    car.spawnMove('u', 'b');
                    for(var i = 0; i < 4; ++i) {
                        makePossible(car.spawnMove('b', 'b'));
                        car.spawnMove('u', 'b');
                    }
                    car.pop();
                    car.move('d');
                    makePossible(car.spawnMove('d', 'b'));
                    car.push();
                    for(var i = 0; i < 4; ++i) {
                        car.spawnMove('d', 'b');
                        makePossible(car.spawnMove('b', 'b'));
                    }
                    car.pop();
                    car.move('u');
                    car.move('f');
                    makePossible(car.spawnMove('u', 'b'));
                    car.push();
                    for(var i = 0; i < 4; ++i) {
                        makePossible(car.spawnMove('u', 'b'));
                    }
                    car.pop();
                    car.pop();
                    break;
                    case "Bishop":
                    car.push()
                    car.spawnMove('u', 'b');
                    car.push();
                    for(var i = 0; i < 4; ++i) {
                        if(i > 0) {
                            car.spawnMove('u', 'b');
                        }
                        makePossible(car.spawnMove('f', 'b'));
                    }
                    car.pop();
                    car.push();
                    for(i = 0; i < 4; ++i) {
                        if(i > 0) {
                            car.spawnMove('u', 'b');
                        }
                        makePossible(car.spawnMove('b', 'b'));
                    }
                    car.pop();
                    car.pop();
                    car.push()
                    car.spawnMove('d', 'b');
                    car.push();
                    for(var i = 0; i < 4; ++i) {
                        if(i > 0) {
                            car.spawnMove('d', 'b');
                        }
                        makePossible(car.spawnMove('f', 'b'));
                    }
                    car.pop();
                    car.push();
                    for(i = 0; i < 4; ++i) {
                        if(i > 0) {
                            car.spawnMove('d', 'b');
                        }
                        makePossible(car.spawnMove('b', 'b'));
                    }
                    car.pop();
                    car.pop();
                    break;
                    case "Knight":
                    car.push();
                    car.spawnMove('u', 'b');
                    car.spawnMove('u', 'b');
                    makePossible(car.spawn('f', 'b'));
                    makePossible(car.spawn('b', 'b'));
                    car.pop();
                    car.push();
                    car.spawnMove('f', 'b');
                    car.spawnMove('f', 'b');
                    makePossible(car.spawn('u', 'b'));
                    makePossible(car.spawn('d', 'b'));
                    car.pop();
                    car.push();
                    car.spawnMove('b', 'b');
                    car.spawnMove('b', 'b');
                    makePossible(car.spawn('u', 'b'));
                    makePossible(car.spawn('d', 'b'));
                    car.pop();
                    car.push();
                    car.spawnMove('d', 'b');
                    car.spawnMove('d', 'b');
                    makePossible(car.spawn('f', 'b'));
                    makePossible(car.spawn('b', 'b'));
                    car.pop();
                    break;
                    }

                    // Scale the internal model.
                    car.move('o');
                    car.node().nodeAt(parsegraph_INWARD).commitLayoutIteratively();
                    var es = car.node().nodeAt(parsegraph_INWARD).extentSize();
                    car.node().nodeAt(parsegraph_INWARD).setScale(
                        1/Math.max(es.width() / 320, es.height() / 320)
                    );
                };
                switch(r) {
                case 8:
                case 1:
                    switch(f) {
                    case 1: makePiece.call(this, "Rook"); break;
                    case 2: makePiece.call(this, "Knight"); break;
                    case 3: makePiece.call(this, "Bishop"); break;
                    case 4: makePiece.call(this, "Queen"); break;
                    case 5: makePiece.call(this, "King"); break;
                    case 6: makePiece.call(this, "Bishop"); break;
                    case 7: makePiece.call(this, "Knight"); break;
                    case 8: makePiece.call(this,"Rook"); break;
                    }
                    break;
                case 2:
                case 7:
                    makePiece.call(this, "Pawn"); break;
                }
            }
            car.pop();
        }
    }
    return this._containerNode;
};

