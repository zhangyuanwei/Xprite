var fs = require("fs"),
    images = require("images"),
    sprite = require("./sprite"),
    Sprite = sprite.Sprite,
    Image = sprite.Image;

var IMAGE_DIR = "./test/";

var list = fs.readdirSync(IMAGE_DIR),
    canvas = new Sprite();

list.forEach(function(item) {
    var file = IMAGE_DIR + item,
        img = images(file),
        size = img.size(),
        xy = Math.random() < 0.5,
        config = {
            width: size.width,
            height: size.height,

            floatX: (xy && Math.random() < 0.1) ? 1 : 0,
            //floatY: (!xy && Math.random() < 0.1) ? 1 : 0,
            repeat: (Math.random() < 0.1) ? 1 : 0,

            //marginTop: 10,
            //marginRight: (Math.ceil(size.width / 24) * 24) - size.width,
            //marginBottom: (Math.ceil(size.height / 24) * 24) - size.height,
            //marginLeft: 10,

            //marginTop: (Math.random() * 10) | 0,
            //marginRight: (Math.random() * 10) | 0,
            //marginBottom: (Math.random() * 10) | 0,
            //marginLeft: (Math.random() * 10) | 0,

            marginTop: (Math.random() * size.height) >> 1,
            marginRight: (Math.random() * size.width) >> 1,
            marginBottom: (Math.random() * size.height) >> 1,
            marginLeft: (Math.random() * size.width) >> 1,
        };
    img = new Image("../" + file, config);
    if (img.area < 1000 && img.width > 1 && img.height > 1) {
        canvas.addImage(img);
    }
});

var startTime, stopTime;
startTime = +new Date();
canvas.reflow();
stopTime = +new Date();
console.log("Done in " + (stopTime - startTime) + "ms");
