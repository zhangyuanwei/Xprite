'use strict';

var REPEAT_NONE = 0,
    REPEAT_X = 1,
    REPEAT_Y = 2,
    FLOAT_NONE = 0,
    FLOAT_TOP = 1,
    FLOAT_BOTTOM = 2,
    FLOAT_LEFT = 1,
    FLOAT_RIGHT = 2,
    DIRECTION_X = 0,
    DIRECTION_Y = 1,
    //位置关系
    OUT = 0,
    IN = 1,
    OVER = 2,
    //矩形相对关系
    STANDALONE = 0,
    OVERLAP = 1,
    INTERNAL = 2,
    EXTERNAL = 3,
    //占用边上某点
    POINT_TOP = 1 << 0,
    POINT_RIGHT = 1 << 1,
    POINT_BOTTOM = 1 << 2,
    POINT_LEFT = 1 << 3,
    //占用整个边
    BORDER_TOP = 1 << 4,
    BORDER_RIGHT = 1 << 5,
    BORDER_BOTTOM = 1 << 6,
    BORDER_LEFT = 1 << 7,
    //占用贯通方向
    THROGH_X = 1 << 8,
    THROGH_Y = 1 << 9,
    //限制(宽高编剧等)
    LIMIT = 10000;

// {{{ 共用方法

function throwNotImplementedException() {
    throw new Error("Method not implemented");
}

function copyProperties(target) {
    target = target || {};
    var args = arguments,
        count = args.length,
        index = 0,
        item, key;

    while (++index < count) {
        item = args[index];
        for (key in item) {
            if (item.hasOwnProperty(key)) {
                target[key] = item[key];
            }
        }
    }
    return target;
}

function rectRelation(x1, y1, w1, h1, x2, y2, w2, h2) {
    var r1, b1, r2, b2, relation, index, postion,
        standalone = false,
        internal = true,
        external = true;

    r1 = x1 + w1;
    b1 = y1 + h1;
    r2 = x2 + w2;
    b2 = y2 + h2;

    relation = [
            y2 > y1 ? (y2 < b1 ? IN : OVER) : OUT, // top
        r2 < r1 ? (r2 > x1 ? IN : OVER) : OUT, // right
        b2 < b1 ? (b2 > y1 ? IN : OVER) : OUT, // bottom
        x2 > x1 ? (x2 < r1 ? IN : OVER) : OUT // length
    ];

    for (index = 0; index < 4; index++) {
        postion = relation[index];
        if (postion == OUT) {
            internal = false;
        } else if (postion == IN) {
            external = false;
        } else if (postion == OVER) {
            standalone = true;
            break;
        }
    }

    return {
        top: relation[0],
        right: relation[1],
        bottom: relation[2],
        left: relation[3],
        state: standalone ? STANDALONE : (internal ? INTERNAL : (external ? EXTERNAL : OVERLAP))
    };
}

function max(a, b) {
    return a > b ? a : b;
}

function min(a, b) {
    return a < b ? a : b;
}
// }}}

function Image(src, config) { // {{{
    this.src = src;
    copyProperties(this, {
        x: undefined,
        y: undefined,
        width: 0,
        height: 0,
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
        floatX: FLOAT_NONE,
        floatY: FLOAT_NONE,
        repeat: REPEAT_NONE
    }, config || {});

    if (this.repeat == REPEAT_X) {
        //this.width = 0;
        this.floatX = FLOAT_NONE;
    }

    if (this.repeat == REPEAT_Y) {
        //this.height = 0;
        this.floatY = FLOAT_NONE;
    }

    this.marginWidth = this.width + this.marginLeft + this.marginRight;
    this.marginHeight = this.height + this.marginTop + this.marginBottom;
    this.area = this.width * this.height;
    this._placed = false;
}
// }}}

function Sprite() { // {{{
    this._images = [];
    this._spaces = null;
    this._config = null;
}

Sprite.prototype.addImage = function(img) { // {{{
    this._images.push(img);
}; // }}}

Sprite.prototype.eachImage = function(callback) { // {{{
    var images, index, count, ret;
    images = this._images;
    count = images.length;
    for (index = 0; index < count; index++) {
        ret = callback.call(this, images[index], index, images);
        if (ret !== undefined)
            return ret;
    }
}; // }}}

Sprite.prototype.eachSpace = function(callback) { // {{{
    var spaces, index, count, ret;
    spaces = this._spaces;
    count = spaces.length;
    for (index = 0; index < count; index++) {
        ret = callback.call(this, spaces[index], index, spaces);
        if (ret !== undefined)
            return ret;
    }
}; // }}}

Sprite.prototype.check = function() { // {{{
    var flag = 0,
        totalArea = 0,
        //minArea = LIMIT * LIMIT,
        minWidth = LIMIT,
        minHeigth = LIMIT,
        conflictImage;

    conflictImage = this.eachImage(function(img) {
        var repeat = img.repeat,
            floatX = img.floatX,
            floatY = img.floatY,
            width = img.width,
            height = img.height,
            area = img.area,
            use = 0,
            conflict = 0;

        totalArea += area;
        //minArea = min(minArea, area);
        minWidth = min(minWidth, width);
        minHeigth = min(minHeigth, height);

        if (floatY == FLOAT_TOP) {
            use |= POINT_TOP;
            conflict |= BORDER_TOP;
        } else if (floatY == FLOAT_BOTTOM) {
            use |= POINT_BOTTOM;
            conflict |= BORDER_BOTTOM;
        }

        if (floatX == FLOAT_LEFT) {
            use |= POINT_LEFT;
            conflict |= BORDER_LEFT;
        } else if (floatX == FLOAT_RIGHT) {
            use |= POINT_RIGHT;
            conflict |= BORDER_RIGHT;
        }

        if (repeat == REPEAT_X) {
            use |= THROGH_X | POINT_LEFT | POINT_RIGHT;
            conflict |= THROGH_Y | BORDER_LEFT | BORDER_RIGHT;

            if (floatY == FLOAT_TOP) {
                use |= BORDER_TOP | POINT_TOP;
                conflict |= BORDER_TOP | POINT_TOP;
            } else if (floatY == FLOAT_BOTTOM) {
                use |= BORDER_BOTTOM | POINT_BOTTOM;
                conflict |= BORDER_BOTTOM | POINT_BOTTOM;
            }
        } else if (repeat == REPEAT_Y) {
            use |= THROGH_Y | POINT_TOP | POINT_BOTTOM;
            conflict |= THROGH_X | BORDER_TOP | BORDER_BOTTOM;

            if (floatX == FLOAT_LEFT) {
                use |= BORDER_LEFT | POINT_LEFT;
                conflict |= BORDER_LEFT | POINT_LEFT;
            } else if (floatX == FLOAT_RIGHT) {
                use |= BORDER_RIGHT | POINT_RIGHT;
                conflict |= BORDER_RIGHT | POINT_RIGHT;
            }
        }

        if (conflict & flag) return img;
        flag |= use;
    });

    if (conflictImage)
        throw new Error("Image " + conflictImage.src + " conflict.");

    this._config = {
        flag: flag,
        direction: flag & THROGH_X ? DIRECTION_Y : DIRECTION_X,
        totalArea: totalArea,
        minWidth: minWidth,
        minHeigth: minHeigth
    };
}; // }}}

Sprite.prototype.sort = function() { // {{{
    var self = this;
    self._images.sort(function(a, b) {
        return (self.getWeight(b) - self.getWeight(a))  || (b.area - a.area);
    });
};
// }}}

Sprite.prototype.getWeight = throwNotImplementedException; // {{{

function getWeight(img) {
    var floatX = img.floatX,
        floatY = img.floatY,
        repeat = img.repeat,
        weight = 0;

    if (floatX == FLOAT_LEFT) weight += 10;
    if (floatY == FLOAT_TOP) weight += 10;
    if (repeat != REPEAT_NONE) weight -= 1;
    if (floatX == FLOAT_RIGHT) weight -= 10;
    if (floatY == FLOAT_BOTTOM) weight -= 10;
    return weight;
}

function getWeightX(img) {
    var floatX = img.floatX,
        floatY = img.floatY,
        repeat = img.repeat;

    if (floatX == FLOAT_LEFT) return 5;
    if (floatY != FLOAT_NONE) return 4;
    if (repeat == REPEAT_Y) return 2;
    if (floatX == FLOAT_RIGHT) return 1;
    return 3;
}

function getWeightY(img) {
    var floatX = img.floatX,
        floatY = img.floatY,
        repeat = img.repeat;

    if (floatY == FLOAT_TOP) return 5;
    if (floatX != FLOAT_NONE) return 4;
    if (repeat == REPEAT_X) return 2;
    if (floatY == FLOAT_BOTTOM) return 1;
    return 3;
}

// }}}

Sprite.prototype.getSize = throwNotImplementedException; // {{{

function getSizeX() {
    var floatLeftWidth = 0,
        floatLeftHeight = 0,
        maxHeight = 0,
        countWidth = 0,
        floatRightWidth = 0,
        floatRightHeight = 0;

    this.eachImage(function(img) {
        var floatX = img.floatX,
            width = img.marginWidth,
            height = img.marginHeight;

        if (floatX == FLOAT_LEFT) {
            floatLeftWidth = max(floatLeftWidth, width);
            floatLeftHeight += height;
        } else if (floatX == FLOAT_RIGHT) {
            floatRightWidth = max(floatRightWidth, width);
            floatRightHeight += height;
        } else {
            maxHeight = max(maxHeight, height);
            countWidth += width;
        }
    });

    return {
        width: floatLeftWidth + countWidth + floatRightWidth,
        height: max(max(floatLeftHeight, max(maxHeight, floatRightHeight)), Math.sqrt(this._config.totalArea))
        //height: max(floatLeftHeight, max(maxHeight, floatRightHeight))
    };
}

function getSizeY() {
    var floatTopWidth = 0,
        floatTopHeight = 0,
        maxWidth = 0,
        countHeight = 0,
        floatBottomWidth = 0,
        floatBottomHeight = 0;

    this.eachImage(function(img) {
        var floatY = img.floatY,
            width = img.marginWidth,
            height = img.marginHeight;

        if (floatY == FLOAT_TOP) {
            floatTopHeight = max(floatTopHeight, height);
            floatTopWidth += width;
        } else if (floatY == FLOAT_BOTTOM) {
            floatBottomHeight = max(floatBottomHeight, height);
            floatBottomWidth += width;
        } else {
            maxWidth = max(maxWidth, width);
            countHeight += height;
        }
    });

    return {
        height: floatTopHeight + countHeight + floatBottomHeight,
        //width: max(max(floatTopWidth, max(maxWidth, floatBottomWidth)), Math.sqrt(this._config.totalArea))
        width: max(floatTopWidth, max(maxWidth, floatBottomWidth))
    };
}
// }}}

Sprite.prototype.cutSpace = function(img) { // {{{
    var spaces = this._spaces,
        count = spaces.length,
        space, ret;
    while (count--) {
        space = spaces[count];
        ret = doCutSpace.call(this, space, img);
        if (ret !== false) {
            spaces.splice.apply(spaces, [count, 1].concat(ret));
        }
    }
};

function doCutSpace(space, img) {
    var ret, relation, relation2, flag,
        x1, y1, w1, h1, t1, r1, b1, l1,
        x2, y2, w2, h2, t2, r2, b2, l2;

    ret = false;

    x1 = space.x;
    y1 = space.y;
    w1 = space.w;
    h1 = space.h;
    t1 = space.t;
    r1 = space.r;
    b1 = space.b;
    l1 = space.l;
    flag = space.f;

    x2 = img.x - img.marginLeft;
    y2 = img.y - img.marginTop;
    w2 = img.marginWidth;
    h2 = img.marginHeight;
    t2 = img.marginTop;
    r2 = img.marginRight;
    b2 = img.marginBottom;
    l2 = img.marginLeft;

    relation = rectRelation(x1, y1, w1, h1, x2, y2, w2, h2);

    //console.log([x1, y1, w1, h1, x2, y2, w2, h2], relation.state);
    //this.trace("cutSpace:" + JSON.stringify({
    //    space: [x1, y1],
    //    state: relation.state
    //}));
    if (relation.state != STANDALONE) {
        ret = [];
        if (relation.top == IN)
            ret.push({
                x: x1,
                y: y1,
                w: w1,
                h: y2 - y1,
                t: t1,
                r: r1,
                b: min(t2, (y1 + h1 + b1) - y2),
                l: l1,
                f: flag & (~BORDER_BOTTOM)
            });

        if (relation.right == IN)
            ret.push({
                x: x2 + w2,
                y: y1,
                w: (x1 + w1) - (x2 + w2),
                h: h1,
                t: t1,
                r: r1,
                b: b1,
                l: min(r2, (x2 + w2) - (x1 - l1)),
                f: flag & (~BORDER_LEFT)
            });

        if (relation.bottom == IN)
            ret.push({
                x: x1,
                y: y2 + h2,
                w: w1,
                h: (y1 + h1) - (y2 + h2),
                t: min(b2, (y2 + h2) - (y1 - t1)),
                r: r1,
                b: b1,
                l: l1,
                f: flag & (~BORDER_TOP)
            });

        if (relation.left == IN)
            ret.push({
                x: x1,
                y: y1,
                w: x2 - x1,
                h: h1,
                t: t1,
                r: min(l2, (x1 + w1 + r1) - x2),
                b: b1,
                l: l1,
                f: flag & (~BORDER_RIGHT)
            });
    } else {
        x1 = space.x - space.l;
        y1 = space.y - space.t;
        w1 = space.l + space.w + space.r;
        h1 = space.t + space.h + space.b;

        x2 = img.x;
        y2 = img.y;
        w2 = img.width;
        h2 = img.height;

        relation = rectRelation(x1, y1, w1, h1, x2, y2, w2, h2);
        //this.trace(JSON.stringify({
        //    state2: relation.state
        //}));
        if (relation.state != STANDALONE) {
            ret = [];

            x1 = space.x;
            y1 = space.y;
            w1 = space.w;
            h1 = space.h;

            relation2 = rectRelation(x1, y1, w1, h1, x2, y2, w2, h2);

            if (relation.top == IN) {
                if (relation2.top == IN) {
                    ret.push({
                        x: x1,
                        y: y1,
                        w: w1,
                        h: y2 - y1,
                        t: t1,
                        r: r1,
                        b: 0,
                        l: l1,
                        f: flag & (~BORDER_BOTTOM)
                    });
                } else if (relation2.top == OVER) {
                    ret.push({
                        x: x1,
                        y: y1,
                        w: w1,
                        h: h1,
                        t: t1,
                        r: r1,
                        b: y2 - (y1 + h1),
                        l: l1,
                        f: flag & (~BORDER_BOTTOM)
                    });
                }
            }

            if (relation.right == IN) {
                if (relation2.right == IN) {
                    ret.push({
                        x: x2 + w2,
                        y: y1,
                        w: (x1 + w1) - (x2 + w2),
                        h: h1,
                        t: t1,
                        r: r1,
                        b: b1,
                        l: 0,
                        f: flag & (~BORDER_LEFT)
                    });
                } else if (relation2.right == OVER) {
                    ret.push({
                        x: x1,
                        y: y1,
                        w: w1,
                        h: h1,
                        t: t1,
                        r: r1,
                        b: b1,
                        l: x1 - (x2 + w2),
                        f: flag & (~BORDER_LEFT)
                    });
                }
            }

            if (relation.bottom == IN) {
                if (relation2.bottom == IN) {
                    ret.push({
                        x: x1,
                        y: y2 + h2,
                        w: w1,
                        h: (y1 + h1) - (y2 + h2),
                        t: 0,
                        r: r1,
                        b: b1,
                        l: l1,
                        f: flag & (~BORDER_TOP)
                    });
                } else if (relation2.bottom == OVER) {
                    ret.push({
                        x: x1,
                        y: y1,
                        w: w1,
                        h: h1,
                        t: y1 - (y2 + h2),
                        r: r1,
                        b: b1,
                        l: l1,
                        f: flag & (~BORDER_TOP)
                    });
                }
            }

            if (relation.left == IN) {
                if (relation2.left == IN) {
                    ret.push({
                        x: x1,
                        y: y1,
                        w: x2 - x1,
                        h: h1,
                        t: t1,
                        r: 0,
                        b: b1,
                        l: l1,
                        f: flag & (~BORDER_RIGHT)
                    });
                } else if (relation2.left == OVER) {
                    ret.push({
                        x: x1,
                        y: y1,
                        w: w1,
                        h: h1,
                        t: t1,
                        r: x2 - (x1 + w1),
                        b: b1,
                        l: l1,
                        f: flag & (~BORDER_RIGHT)
                    });
                }
            }
        }
    }

    return ret;
} // }}}

Sprite.prototype.mergeSpace = function() { // {{{
    var spaces = this._spaces,
        count = spaces.length,
        config = this._config,
        minWidth = config.minWidth,
        minHeigth = config.minHeigth,
        i, j, s1, s2,
        x, y, w, h, t, r, b, l, f,
        x1, y1, w1, h1, t1, r1, b1, l1, f1,
        x2, y2, w2, h2, t2, r2, b2, l2, f2,
        changed, relation;

    i = count && (count - 1);
    while (i--) {
        s1 = spaces[i];
        x1 = s1.x;
        y1 = s1.y;
        w1 = s1.w;
        h1 = s1.h;
        t1 = s1.t;
        r1 = s1.r;
        b1 = s1.b;
        l1 = s1.l;
        f1 = s1.f;
        do {
            changed = false;
            j = count;
            while ((--j) > i) {
                s2 = spaces[j];
                x2 = s2.x;
                y2 = s2.y;
                w2 = s2.w;
                h2 = s2.h;
                t2 = s2.t;
                r2 = s2.r;
                b2 = s2.b;
                l2 = s2.l;
                f2 = s2.f;
                relation = rectRelation(x1, y1, w1, h1, x2, y2, w2, h2);
                if (relation.state != STANDALONE) {
                    if (x1 == x2 && l1 == l2 && w1 == w2 && r1 == r2) {
                        y = min(y1, y2);
                        h = max(y1 + h1, y2 + h2) - y;
                        t = y - min(y1 - t1, y2 - t2);
                        b = max(y1 + h1 + b1, y2 + h2 + b2) - (y + h);
                        f = f1 | f2;
                        y1 = s1.y = y;
                        h1 = s1.h = h;
                        t1 = s1.t = t;
                        b1 = s1.b = b;
                        f1 = s1.f = f;
                        spaces.splice(j, 1);
                        count--;
                        changed = true;
                    } else if (y1 == y2 && t1 == t2 && h1 == h2 && b1 == b2) {
                        x = min(x1, x2);
                        w = max(x1 + w1, x2 + w2) - x;
                        l = x - min(x1 - l1, x2 - l2);
                        r = max(x1 + w1 + r1, x2 + w2 + r2) - (x + w);
                        f = f1 | f2;
                        x1 = s1.x = x;
                        w1 = s1.w = w;
                        r1 = s1.r = r;
                        l1 = s1.l = l;
                        f1 = s1.f = f;
                        spaces.splice(j, 1);
                        count--;
                        changed = true;
                    }
                }
            }
        } while (changed);
        if (w1 < minWidth || h1 < minHeigth) {
            spaces.splice(i, 1);
            count--;
        }
    }
}; // }}}

Sprite.prototype.compareSpace = throwNotImplementedException; // {{{

function compareSpace(a, b) {
    return max(a.x, a.y) - max(b.x, b.y);
}

function compareSpaceX(a, b) {
    return a.x - b.x;
}

function compareSpaceY(a, b) {
    return a.y - b.y;
} // }}}

Sprite.prototype.sortSpace = function() { // {{{
    this._spaces.sort(this.compareSpace);
}; // }}}

Sprite.prototype.place = function() { // {{{
    var size, spaceList, errorImage;
    //size = this.getSize();
    this._spaces = spaceList = [{
            x: 0,
            y: 0,
            //w: size.width,
            //h: size.height,
            w: LIMIT,
            h: LIMIT,

            t: LIMIT,
            r: LIMIT,
            b: LIMIT,
            l: LIMIT,
            f: BORDER_TOP | BORDER_RIGHT | BORDER_BOTTOM | BORDER_LEFT
        }
    ];

    errorImage = this.eachImage(function(img) {
        var floatX, floatY, repeat,
            spaces, spaceCount, spaceIndex, space,
            callbacks, callbackCount, callbackIndex;

        floatX = img.floatX;
        floatY = img.floatY;
        repeat = img.repeat;

        callbacks = [spaceCheck];

        if (floatX == FLOAT_LEFT) {
            callbacks.push(clearLeft);
        } else if (floatX == FLOAT_RIGHT) {
            callbacks.push(clearRight);
        }

        if (floatY == FLOAT_TOP) {
            callbacks.push(clearTop);
        } else if (floatY == FLOAT_BOTTOM) {
            callbacks.push(clearBottom);
        }

        if (repeat == REPEAT_X) {
            callbacks.push(clearLeft, clearRight);
        } else if (repeat == REPEAT_Y) {
            callbacks.push(clearTop, clearBottom);
        }

        callbackCount = callbacks.length;
        spaces = spaceList;
        spaceCount = spaces.length;

        this.trace("spaceCount:" + spaceCount + " image(" + img.width + ", " + img.height + "," +
            (floatX == FLOAT_LEFT ? "left" : (floatX == FLOAT_RIGHT ? "right" : "")) + " " +
            (floatY == FLOAT_TOP ? "top" : (floatY == FLOAT_BOTTOM ? "bottom" : "")) + " " +
            (repeat == REPEAT_X ? "x" : (repeat == REPEAT_Y ? "y" : "")) + ")");

        nextSpace:
		for (spaceIndex = 0; spaceIndex < spaceCount; spaceIndex++) {
            space = spaces[spaceIndex];
            callbackIndex = callbackCount;
            while (callbackIndex--) {
                if (!(callbacks[callbackIndex](space, img)))
                    continue nextSpace;
            }
            img._placed = true;
            //this.trace("place");
            this.cutSpace(img);
            //this.trace("cutSpace");
            this.mergeSpace();
            //this.trace("mergeSpace");
            this.sortSpace();
            //this.trace("sortSpace");
            return;
        }

        return img;
    });
    if (errorImage)
        throw new Error("Image " + errorImage.src + " cant place.");
};

function spaceCheck(space, img) { // {{{
    var x1, y1, x2, y2,
        sx, sy, sw, sh, st, sr, sb, sl,
        ix, iy, iw, ih, it, ir, ib, il;

    sx = space.x;
    sy = space.y;
    sw = space.w;
    sh = space.h;
    st = space.t;
    sr = space.r;
    sb = space.b;
    sl = space.l;

    ix = img.x;
    iy = img.y;
    iw = img.width;
    ih = img.height;
    it = img.marginTop;
    ir = img.marginRight;
    ib = img.marginBottom;
    il = img.marginLeft;

    ix = (ix === undefined) ? (il > sl ? sx - sl + il : sx) : ix;
    iy = (iy === undefined) ? (it > st ? sy - st + it : sy) : iy;

    // 检查图像左上角margin是否在空间左上角margin内
    x1 = sx - sl;
    y1 = sy - st;
    x2 = ix - il;
    y2 = iy - it;
    if (x2 < x1 || y2 < y1) return false;

    // 检查图像左上角是否在空间左上角内
    x1 += sl;
    y1 += st;
    x2 += il;
    y2 += it;
    if (x2 < x1 || y2 < y1) return false;

    // 检查图像右下角是否在空间右下角内
    x1 += sw;
    y1 += sh;
    x2 += iw;
    y2 += ih;
    if (x2 > x1 || y2 > y1) return false;

    // 检查图像右下角margin是否在空间右下角margin内
    x1 += sr;
    y1 += sb;
    x2 += ir;
    y2 += ib;
    if (x2 > x1 || y2 > y1) return false;

    img.x = ix;
    img.y = iy;
    return true;
}

function clearTop(space, img) {
    return space.f & BORDER_TOP;
}

function clearRight(space, img) {
    return space.f & BORDER_RIGHT;
}

function clearBottom(space, img) {
    return space.f & BORDER_BOTTOM;
}

function clearLeft(space, img) {
    return space.f & BORDER_LEFT;
}
// }}}

// }}}

Sprite.prototype.reflow = function() { // {{{
    this.check();

    this.getWeight = getWeight;
    this.compareSpace = compareSpace;
    //if (this._config.direction === DIRECTION_Y) {
    //    this.getWeight = getWeightY;
    //    this.getSize = getSizeY;
    //    this.compareSpace = compareSpaceY;
    //} else {
    //    this.getWeight = getWeightX;
    //    this.getSize = getSizeX;
    //    this.compareSpace = compareSpaceX;
    //};

    this.sort();
    this.place();
    //this.place();
}; // }}}

Sprite.prototype.trace = function(message) { // {{{
    var output = {},
        images = [],
        spaces = [];
    this.eachImage(function(img) {
        if (img._placed)
            images.push([img.src, img.x, img.y, img.width, img.height, img.marginTop, img.marginRight, img.marginBottom, img.marginLeft]);
    });
    this.eachSpace(function(spc) {
        spaces.push([spc.x, spc.y, spc.w, spc.h, spc.t, spc.r, spc.b, spc.l]);
    });
    output.images = images;
    output.spaces = spaces;
    output.message = message || "";
    require("fs").writeFileSync("./output/" + _debug_id+++".json", JSON.stringify(output));
};
var _debug_id = 0;
// }}}

// }}}

exports.Sprite = Sprite;
exports.Image = Image;
// vim600: sw=4 ts=4 fdm=marker syn=javascript
