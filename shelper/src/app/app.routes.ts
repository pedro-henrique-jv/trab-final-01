import { Routes } from '@angular/router';
import {RegisterComponent} from './register/register';
import {LoginComponent} from './login/login';
import {HomeComponent} from './home/home';
import {StudyflowComponent} from './studyflow/studyflow';
import {QuestionsComponent} from './questions/questions';
import {NewStudyflowComponent} from './new-studyflow/new-studyflow';
import {StatusComponent} from './status/status';
import {AnsweredQuestionsComponent} from './answered-questions/answered-questions';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'studyflow',
    component: StudyflowComponent
  },
  {
    path: 'studyflow-questions',
    component: QuestionsComponent
  },
  {
    path: 'new-studyflow',
    component: NewStudyflowComponent
  },
  {
    path: 'studyflow-status',
    component: StatusComponent
  },
  {
    path: 'answered-questions',
    component: AnsweredQuestionsComponent
  }
];
