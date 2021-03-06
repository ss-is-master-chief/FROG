// @flow

import React, { Component } from 'react';
import styled from 'styled-components';
import Mousetrap from 'mousetrap';
import type { ActivityRunnerPropsT } from 'frog-utils';

import ThumbList from './components/ThumbList';
import TopBar from './components/TopBar';
import ZoomView from './components/ZoomView';

const Main = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
`;

type ActivityRunnerStateT = {
  zoomOn: boolean,
  index: number,
  category: string,
  webcamOn: boolean
};

class ActivityRunner extends Component<
  ActivityRunnerPropsT,
  ActivityRunnerStateT
> {
  categories: {
    [categoryName: string]: string[]
  };

  constructor(props) {
    super(props);
    Mousetrap.bind('esc', () => this.setState({ zoomOn: false }));

    const { data, activityData } = props;
    this.categories = Object.keys(data || {}).reduce(
      (acc, key) => ({
        ...acc,
        all: [...(acc.all || []), data[key]],
        ...(data[key].categories &&
          data[key].categories.reduce(
            (_acc, cat) => ({
              ..._acc,
              [cat]: [...(acc[cat] || []), data[key]]
            }),
            {}
          ))
      }),
      {}
    );

    const startingCategory =
      Object.keys(this.categories).length > 1 &&
      !activityData.config.hideCategory
        ? 'categories'
        : 'all';

    this.state = {
      zoomOn: false,
      index: 0,
      category: startingCategory,
      webcamOn: false
    };
  }

  componentWillUnmount() {
    Mousetrap.unbind('esc');
  }

  render() {
    const { activityData, data, dataFn, userInfo, logger, stream } = this.props;
    const minVoteT = activityData.config.minVote || 1;

    const images = Object.keys(data)
      .filter(
        key =>
          this.state.category === 'all' ||
          (data[key].categories !== undefined &&
            data[key].categories.includes(this.state.category))
      )
      .map(key => ({ ...data[key], key }));

    const vote = (key, userId) => {
      logger({ type: 'vote', itemId: key });
      const prev = data[key].votes ? data[key].votes[userId] : false;
      dataFn.objInsert(!prev, [key, 'votes', userId]);
      stream(!prev, [key, 'votes', userId]);
    };

    const setCategory = (c: string) => this.setState({ category: c });
    const setZoom = (z: boolean) => this.setState({ zoomOn: z });
    const setIndex = (i: number) => this.setState({ index: i });

    const showCategories =
      this.state.category === 'categories' && !activityData.config.hideCategory;
    return (
      <Main>
        <TopBar
          categories={[...Object.keys(this.categories)]}
          category={this.state.category}
          canVote={activityData.config.canVote}
          hideCategory={activityData.config.hideCategory}
          guidelines={activityData.config.guidelines}
          {...{ setCategory, setZoom }}
        />
        <ThumbList
          {...{
            images,
            categories: this.categories,
            minVoteT,
            vote,
            userInfo,
            setCategory,
            setZoom,
            setIndex,
            logger,
            showCategories,
            LearningItem: dataFn.LearningItem
          }}
          canVote={activityData.config.canVote}
        />
        {this.props.activityData.config.canUpload && (
          <div style={{ position: 'absolute', bottom: '10px' }}>
            <dataFn.LearningItem
              liType={activityData.config.onlyImages ? 'li-image' : undefined}
              meta={{
                comment: '',
                votes: {},
                categories:
                  this.state.category &&
                  this.state.category !== 'categories' &&
                  this.state.category !== 'all'
                    ? this.state.category
                    : []
              }}
              type="create"
              autoInsert
            />
          </div>
        )}
        {this.state.category !== 'categories' &&
          this.state.zoomOn && (
            <ZoomView
              index={this.state.index}
              commentBox={activityData.config.canComment}
              commentGuidelines={activityData.config.commentGuidelines}
              close={() => setZoom(false)}
              {...{
                images,
                LearningItem: dataFn.LearningItem,
                setIndex,
                dataFn,
                logger
              }}
            />
          )}
      </Main>
    );
  }
}

ActivityRunner.displayName = 'ActivityRunner';
export default (props: ActivityRunnerPropsT) => <ActivityRunner {...props} />;
