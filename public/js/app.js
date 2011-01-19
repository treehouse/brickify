(function(){
  // Units in mm
  
  BRICK_WIDTH = 8; //mm
  BRICK_HEIGHT = 9.6; //mm
  
  window.Brickifier = function(canvas){
    this.$canvas = $(canvas);
    this.canvas  = this.$canvas[0]
    this.ctx     = this.canvas.getContext('2d');
    
    this.final_width = 500; //mm
  }

  _.extend(Brickifier.prototype, {
    
    /* Load img src, and async trigger this.process() */
    initialize: function(img){
      var self = this;
      this.img = $('<img>').load(function(){
        self.img_width = self.img.height;
        self.img_height = self.img.width;
        
        self.process();
      }).attr('src', img).appendTo('body').hide()[0];
    },
    
    process: function(){
      this.calculateDimensions();
      this.drawImage();
      this.generateColorGrid();
      this.drawBlocks();
      console.log(this.getBrickColor(1,10));
    },
    
    calculateDimensions: function(){
      var prop = this.img_width / this.img_height;
      
      // Scale height to fit proportions.
      this.canvas.height = Math.floor(this.canvas.width * prop);
      this.final_height = Math.floor(this.final_width * prop);
      
      // Number of bricks wide, tall 
      this.bricks_x = Math.floor(this.final_width / BRICK_WIDTH);
      this.bricks_y = Math.floor(this.final_height/ BRICK_HEIGHT); 
      
      // Width, Height of 1x1 brick in pixels (at scale)
      this.brick_width = this.canvas.width / this.bricks_x;
      this.brick_height = this.canvas.height / this.bricks_y;
    },
    
    drawImage: function(){
      this.ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
    },
    
    getBrickColor: function(x, y){
      var data = this.ctx.getImageData(
        x * this.brick_width,
        y * this.brick_height,
        this.brick_width,
        this.brick_height
      )
      
      var color = [0,0,0], length = data.data.length;
      
      for(var i=0; i < length; i += 4){
        color[0] += data.data[i];
        color[1] += data.data[i+1];
        color[2] += data.data[i+2];
      }
      
      color[0] /= length/4;
      color[1] /= length/4;
      color[2] /= length/4;
          
      return color;
    },
    
    generateColorGrid: function(){
      this.colorGrid = []
      
      for(var x=0; x < this.bricks_x; x++ ){
        this.colorGrid[x] = [];
        
        for(var y=0; y < this.bricks_y; y++){
          this.colorGrid[x][y] = this.getBrickColor(x, y);
        }
      }
    },
    
    drawBlocks: function(){
      var c, style;
      for(var x=0; x < this.bricks_x; x++){
        for(var y=0; y < this.bricks_y; y++){
          c = this.colorGrid[x][y];
          style = "rgb("+Math.round(c[0])+","+Math.round(c[1])+","+Math.round(c[2])+")";
          console.log(style);
          this.ctx.fillStyle = style;
          console.log(this.ctx.fillStyle);
          this.ctx.fillRect(x*this.brick_width, y*this.brick_height, this.brick_width, this.brick_height);
        }
      }
    }
  })
})() ;


$(function(){
  b = new Brickifier('#canvas');
  b.initialize('/images/carsonified.png');
})