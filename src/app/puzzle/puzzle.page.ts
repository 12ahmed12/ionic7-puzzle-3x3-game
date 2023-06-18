import {AfterViewInit, Component, ElementRef, HostBinding, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {
  AlertController,
  IonInfiniteScroll,
  IonRefresher,
  ModalController,
  Platform,
  ViewWillEnter
} from '@ionic/angular';
import * as dayjs from 'dayjs';
import {takeUntil} from "rxjs/operators";
import {Subject} from "rxjs";
import {FormBuilder, FormGroup} from "@angular/forms";

@Component({
  selector: 'app-puzzle',
  templateUrl: 'puzzle.page.html',
  styleUrls: ['puzzle.page.scss']
})
export class PuzzlePage implements OnInit {

  matrix: any[][] = [
    [{i:1,img:null}, {i:2,img:null}, {i:3,img:null}],
    [{i:4,img:null}, {i:5,img:null}, {i:6,img:null}],
    [{i:7,img:null}, {i:8,img:null}, {i:0,img:null}],
  ];
  winmatrix: any[][] = [
    [{i:1,img:null}, {i:2,img:null}, {i:3,img:null}],
    [{i:4,img:null}, {i:5,img:null}, {i:6,img:null}],
    [{i:7,img:null}, {i:8,img:null}, {i:0,img:null}],
  ];

  canvasElement: any;

  imagesPart: unknown = [];
  expirationDate: string = dayjs(new Date(0, 0, 0, 0, 3,0)).format('MM/DD/YYYY HH:mm:ss');
  timer: any;
  startTime: number = 0;
  endTime: number = 0;
  minutes: string = '03';
  seconds: string = '00';
  totalTime: number = 180;
  totalUsedSecond: number = 0;
  showCountdown = false;
  stepCount:number = 0;
  puzzleReady:boolean = false;
  puzzleStarted: boolean = false;

  constructor(public router: Router, public modelCtrl: ModalController,
              public activatedRoute:ActivatedRoute,
              public alertController:AlertController,
              public formBuilder: FormBuilder) {
  }

  ngOnInit() {
    console.log('on-init');
     this.loadImageTiles();
  }

  loadImageTiles(){
    var that = this;
    function splitImage(imageUrl, numParts) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "Anonymous"; // Enable CORS if needed
        image.src = imageUrl;

        image.onload = function() {
          const parts = [];

          const rows = Math.sqrt(numParts);
          const partWidth = image.width / rows;
          const partHeight = image.height / rows;

          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < rows; j++) {
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');

              canvas.width = partWidth;
              canvas.height = partHeight;

              context.drawImage(
                image,
                j * partWidth,
                i * partHeight,
                partWidth,
                partHeight,
                0,
                0,
                partWidth,
                partHeight
              );

              const dataUrl = canvas.toDataURL();
              parts.push(dataUrl);
            }
          }

          resolve(parts);
        };

        image.onerror = function() {
          reject(new Error('Failed to load the image.'));
        };
      });
    }

    let testImg = 'https://cfx-wp-images.imgix.net/2023/02/Kia-Soul-2-scaled.jpg?auto=compress%2Cformat&ixlib=php-3.3.0&s=bcb9e8210f2e8ca22570a87034430594';
    splitImage(testImg,9)
      .then(parts => {
        //console.log(parts); // Array containing the 16 vertically split parts of the image
        that.imagesPart  = parts;
        let newArr = [];
        newArr = transformArray(parts,3);
        that.matrix = JSON.parse(JSON.stringify(newArr));
        that.winmatrix =JSON.parse(JSON.stringify(newArr));
        console.log('matrix-  ',this.matrix);
        that.puzzleReady = true;
        that.stepCount = 0;

      })
      .catch(error => {
        console.error(error);
      });

    function transformArray(arr, columns) {
      const result = [];
      for (let i = 0; i < arr.length; i += columns) {
        const row = arr.slice(i, i + columns);
        const mappedRow = row.map((value, index) => ({ img:value, i: (i + index +1) == 9 ? 0:(i + index +1) }));
        result.push(mappedRow);
      }
      return result;
    }
  }

  checkForCompletion() {
    let didNotWin =false;
    for (let i = 0; i < this.matrix.length; i++) {
      for (let j = 0; j < this.matrix[0].length; j++) {
        //console.log('win-matrix - ',this.winmatrix[i][j]['i'] + ' matrix - '+this.matrix[i][j]['i']);
        if (this.winmatrix[i][j]['i'] != this.matrix[i][j]['i']) {
          didNotWin = true;
          break;
        }
      }
    }
    if(!didNotWin) {
      this.stopTimer();
      this.presentPuzzleAlert(this.totalUsedSecond,this.stepCount);
    }
  }

  async presentPuzzleAlert(time , steps) {
    const alert = await this.alertController.create({
      mode: 'ios',
      backdropDismiss: false,
      message: '<strong> Puzzle Completed </strong> </br> ' +
        ' you completed the puzzle in </br> <strong>' +time +' second </strong>'+
        ' and used <strong> ' + steps +' steps </br> </strong> ',
      cssClass: 'customSuccessAlert',
      buttons: [
        {
          text: 'Restart',
          cssClass: 'secondary',
          handler: () => {
            console.log('restarted');
            this.shuffleMatrix();
          }
        },
      ]
    });

    await alert.present();
  }


  // move the tile to the empty space
  moveTile(i, j) {
    if (this.puzzleStarted){
      this.swapTile(i, j);
      setTimeout(()=>{
        this.checkForCompletion();
      },300);
    }
  }

  // check the four sides of the tile to which it can be swapped
  swapTile(i: number, j: number) {
    if (i + 1 < this.matrix.length && this.matrix[i + 1][j]['i'] == 0) {
      this.matrix[i + 1][j]['i'] = this.matrix[i][j]['i'];
      this.matrix[i + 1][j]['img'] = this.matrix[i][j]['img'];
      this.matrix[i][j]['i'] = 0;
      this.stepCount++;
    } else if (j + 1 < this.matrix[0].length && this.matrix[i][j + 1]['i'] == 0) {
      this.matrix[i][j + 1]['i'] = this.matrix[i][j]['i'];
      this.matrix[i][j + 1]['img'] = this.matrix[i][j]['img'];
      this.matrix[i][j]['i'] = 0;
      this.stepCount++;
    } else if (i - 1 >= 0 && this.matrix[i - 1][j]['i'] == 0) {
      this.matrix[i - 1][j]['i'] = this.matrix[i][j]['i'];
      this.matrix[i - 1][j]['img'] = this.matrix[i][j]['img'];
      this.matrix[i][j]['i'] = 0;
      this.stepCount++;
    } else if (j - 1 >= 0 && this.matrix[i][j - 1]['i'] == 0) {
      this.matrix[i][j - 1]['i'] = this.matrix[i][j]['i'];
      this.matrix[i][j - 1]['img'] = this.matrix[i][j]['img'];
      this.matrix[i][j]['i'] = 0;
      this.stepCount++;
    }
  }

  shuffleMatrix(){
    const rows = this.matrix.length;
    const cols = this.matrix[0].length;
    const totalElements = rows * cols;

    for (let i = totalElements - 1; i >= 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      const rowIndex1 = Math.floor(randomIndex / cols);
      const colIndex1 = randomIndex % cols;
      const rowIndex2 = Math.floor(i / cols);
      const colIndex2 = i % cols;

      // Swap the elements at the random index and current index
      const temp = this.matrix[rowIndex1][colIndex1];
      this.matrix[rowIndex1][colIndex1] = this.matrix[rowIndex2][colIndex2];
      this.matrix[rowIndex2][colIndex2] = temp;
    }

    console.log('matrix-after-shuffle ',this.matrix);
    this.puzzleStarted = true;
    this.showCountdown = true;
    this.startTimer();
  }


  startTimer() {
    this.minutes = '03';
    this.seconds = '00';
    this.totalTime = 180;
    this.stepCount = 0;
    this.startTime = new Date().getTime();
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.totalTime -= 1;
      this.updateTimeDisplay();
      if (this.totalTime === 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  stopTimer() {
    this.endTime = new Date().getTime();
    console.log('end-time ',this.endTime);
    console.log('start-time ',this.startTime);
    this.totalUsedSecond = Math.floor((this.endTime - this.startTime) / 1000);
    console.log('usedSeconds ',this.totalUsedSecond);
    clearInterval(this.timer);
    this.updateTimeDisplay();
  }

  updateTimeDisplay() {
    const minutes = Math.floor(this.totalTime / 60);
    const seconds = this.totalTime % 60;
    this.minutes = this.formatTime(minutes);
    this.seconds = this.formatTime(seconds);
    console.log('minutes' ,this.minutes);
    console.log('sec' ,this.seconds);
  }

  formatTime(time: number) {
    return time < 10 ? '0' + time : String(time);
  }

}
