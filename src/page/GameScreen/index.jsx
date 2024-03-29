import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { fetchQuestionsAndAnswers } from '../../api/handleAPI';
import Answers from '../../components/Answers';
import Question from '../../components/Question';
import Header from '../../components/Header';
import { attScore, secondsTimer } from '../../redux/actions';
import Timer from '../../components/Timer';
import { setStorage, getStorage } from '../../services/handleLocalStorage';
import './styles.css';

const DEZ = 10;
const HARD = 3;
const MEDIUM = 2;
const EASY = 1;

class GameScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      questions: [],
      alternatives: [],
      index: 0,
      borderCorrect: '',
      borderWrong: '',
      info: { name: '', score: 0, picture: '' },
      bttDisabled: false,
    };
  }

  componentDidMount() {
    this.mountQuestions();
  }

  mountQuestions = async () => {
    const { token, configs = { type: '', category: '', difficulty: '' } } = this.props;
    const { results } = await fetchQuestionsAndAnswers(
      token,
      configs,
    );
    this.setState({ questions: results }, () => {
      this.generateAlternatives();
    });
  }

  nextQuestion = () => {
    const { index, questions } = this.state;
    if (index === questions.length - 1) {
      const ranking = getStorage('ranking');
      if (getStorage('rankingPlayers') === null) {
        setStorage('rankingPlayers', [ranking]);
      } else {
        setStorage('rankingPlayers', [...getStorage('rankingPlayers'), ranking]);
      }
      const { history } = this.props;
      history.push('/feedback');
    }
    if (index < questions.length) {
      this.setState({
        index: index + 1,
        borderCorrect: '',
        borderWrong: '',
        bttDisabled: false,
      }, () => {
        this.generateAlternatives();
        const { time } = this.props;
        const thirty = 30;
        time(thirty);
      });
    }
  }

  generateAlternatives = () => {
    const { questions, index } = this.state;
    const alternatives = [
      questions[index].correct_answer, ...questions[index].incorrect_answers,
    ];
    const shuffledAlternatives = this.shuffleArray(alternatives);
    this.setState({ alternatives: shuffledAlternatives });
  }

  timeOutFunc = () => {
    this.setState({ bttDisabled: true }, () => this.showAnswersResults());
  }

  shuffleArray = (array) => {
    const shuffledArray = [...array];
    let currentIndex = shuffledArray.length;
    let randomIndex = 0;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      [shuffledArray[currentIndex], shuffledArray[randomIndex]] = [
        shuffledArray[randomIndex], shuffledArray[currentIndex]];
    }
    return shuffledArray;
  }

  showAnswersResults = (answer) => {
    this.setState({
      borderCorrect: 'border-correct',
      borderWrong: 'border-wrong',
    });
    const { time } = this.props;
    time(0);
    this.updateScore(answer);
  }

  updateScore = (answer) => {
    const { questions, index } = this.state;
    const { changeScore, stopWatch } = this.props;
    const { name, picture, score, numberOfCorrectAnswers: NOCA } = getStorage('ranking');

    let newScore = 0;
    const numberOfCorrectAnswers = NOCA + 1;

    if (answer === questions[index].correct_answer) {
      if (questions[index].difficulty === 'hard') {
        newScore = score + (DEZ + (stopWatch * HARD));
      } else if (questions[index].difficulty === 'medium') {
        newScore = score + (DEZ + (stopWatch * MEDIUM));
      } else if (questions[index].difficulty === 'easy') {
        newScore = score + (DEZ + (stopWatch * EASY));
      }
      setStorage('ranking', {
        name, score: newScore, picture, numberOfCorrectAnswers,
      });
      changeScore(newScore, numberOfCorrectAnswers);
      this.setState({ info: { name, score: newScore, picture } });
    }
  }

  game = () => {
    const {
      questions,
      index,
      borderCorrect,
      borderWrong,
      alternatives,
      info,
      bttDisabled,
    } = this.state;
    return (
      <section className="default-container gamescreen-component">
        <Header info={ info } />
        <div className="default-field">
          <div className="questions-area">
            <Question
              category={ questions[index].category }
              question={ questions[index].question }
            />
            <Answers
              bttDisabled={ bttDisabled }
              alternatives={ alternatives }
              correct={ questions[index].correct_answer }
              showAnswersResults={ this.showAnswersResults }
              borderCorrect={ borderCorrect }
              borderWrong={ borderWrong }
            />
          </div>
          <div className="button-area">
            { borderCorrect !== '' && (
              <button
                className="default-pink-button"
                type="submit"
                data-testid="btn-next"
                onClick={ this.nextQuestion }
              >
                PRÓXIMA
              </button>
            )}
          </div>
        </div>
        <Timer timeOutFunc={ this.timeOutFunc } />
      </section>
    );
  }

  render() {
    const { questions } = this.state;
    if (questions.length > 0) {
      return this.game();
    }
    return (
      <h1>Loading...</h1>
    );
  }
}

const mapStateToProps = (state) => ({
  token: state.token,
  stopWatch: state.reducerTimer.seconds,
  configs: state.reducerConfig.configs,
});

const mapDispatchToProps = (dispatch) => ({
  time: (payload) => dispatch(secondsTimer(payload)),
  changeScore: (score, assertions) => dispatch(attScore(score, assertions)),
});

GameScreen.propTypes = {
  token: PropTypes.object,
}.isRequired;

export default connect(mapStateToProps, mapDispatchToProps)(GameScreen);
