/* eslint-disable no-useless-escape */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import moment from 'moment';
import { compose } from 'recompose';
import { bindActionCreators } from 'redux';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { withRouter } from 'react-router-dom';
import { Icon, Tooltip, message } from 'antd';
import Button from '@material-ui/core/Button';
import {
  getTokenContract,
  getVoteContract,
  methods
} from 'utilities/ContractService';
import { connectAccount, accountActionCreators } from 'core';
import MainLayout from 'containers/Layout/MainLayout';
import ProposalInfo from 'components/Vote/VoteOverview/ProposalInfo';
import VoteCard from 'components/Vote/VoteOverview/VoteCard';
import ProposalDetail from 'components/Vote/VoteOverview/ProposalDetail';
import ProposalHistory from 'components/Vote/VoteOverview/ProposalHistory';
import { promisify } from 'utilities';
import { Row, Column } from 'components/Basic/Style';
import { Card } from 'components/Basic/Card';
import { useInstance } from 'hooks/useContract';

const VoteOverviewWrapper = styled.div`
  width: 100%;

  .vote-status-update {
    margin-top: 30px;
    margin-bottom: 20px;
    button {
      width: 120px;
      height: 40px;
      background: linear-gradient(
        242deg,
        #246cf9 0%,
        #1e68f6 0.01%,
        #0047d0 100%,
        #0047d0 100%
      );
      border-radius: 6px;
      .MuiButton-label {
        font-size: 16px;
        font-weight: bold;
        color: var(--color-text-main);
        text-transform: capitalize;
      }
      &:not(:last-child) {
        margin-right: 10px;
      }
    }

    .warning {
      color: var(--color-blue);
      margin: 20px 0px;
    }

    i {
      color: var(--color-yellow);
    }
  }

  .column-1 {
    flex: 3;
    margin-right: 19px;
    .section-1 {
      margin-bottom: 25px;
      .proposal-info {
        flex: 1;
        margin-right: 19px;
      }
      .proposal-user {
        flex: 1;
        margin-left: 19px;
      }
    }
    .section-2 {
      margin-bottom: 35px;
      .agree-section {
        flex: 1;
        margin-right: 19px;
      }
      .against-section {
        flex: 1;
        margin-left: 19px;
      }
    }
  }
  .column-2 {
    flex: 1;
    margin-left: 19px;
  }

  .styled-row {
    display: flex;

    @media (max-width: 1024px) {
      display: block;
    }
  }
`;

const CardWrapper = styled.div`
  width: 100%;
  background-color: var(--color-bg-primary);
  border-radius: 6px;
  padding: 38px 41px;
`;

function VoteOverview({ settings, getVoters, getProposalById, match }) {
  const instance = useInstance(settings.walletConnected);
  const [proposalInfo, setProposalInfo] = useState({});
  const [agreeVotes, setAgreeVotes] = useState({});
  const [againstVotes, setAgainstVotes] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [status, setStatus] = useState('pending');
  const [cancelStatus, setCancelStatus] = useState('pending');
  const [proposalThreshold, setProposalThreshold] = useState(0);
  const [proposerVotingWeight, setProposerVotingWeight] = useState(0);
  const [isPossibleExcuted, setIsPossibleExcuted] = useState(false);
  const [excuteEta, setExcuteEta] = useState('');

  const updateBalance = useCallback(async () => {
    if (settings.selectedAddress && proposalInfo.id) {
      const strkTokenContract = getTokenContract(instance, 'strk');
      const voteContract = getVoteContract(instance);
      await methods
        .call(voteContract.methods.proposalThreshold, [])
        .then(res => {
          setProposalThreshold(+Web3.utils.fromWei(res, 'ether'));
        });
      await methods
        .call(strkTokenContract.methods.getCurrentVotes, [
          proposalInfo.proposer
        ])
        .then(res => {
          setProposerVotingWeight(+Web3.utils.fromWei(res, 'ether'));
        });
    }
  }, [settings.selectedAddress, proposalInfo, instance]);
  useEffect(() => {
    if (settings.selectedAddress) {
      updateBalance();
    }
  }, [settings.selectedAddress, updateBalance]);

  useEffect(() => {
    if (match.params && match.params.id) {
      promisify(getProposalById, {
        id: match.params.id
      }).then(res => {
        setProposalInfo(res.data);
      });
    }
  }, [match, getProposalById]);

  const loadVotes = useCallback(
    async limit => {
      if (proposalInfo.id) {
        await promisify(getVoters, {
          id: proposalInfo.id,
          limit,
          filter: 'for'
        })
          .then(res => setAgreeVotes(res.data || {}))
          .catch(err => {
            setAgreeVotes({});
          });
        await promisify(getVoters, {
          id: proposalInfo.id,
          limit,
          filter: 'against'
        })
          .then(res => setAgainstVotes(res.data || {}))
          .catch(err => {
            setAgainstVotes({});
          });
      }
    },
    [getVoters, proposalInfo]
  );

  const getIsPossibleExcuted = () => {
    const voteContract = getVoteContract(instance);
    methods
      .call(voteContract.methods.proposals, [proposalInfo.id])
      .then(res => {
        setIsPossibleExcuted(res && res.eta <= Date.now() / 1000);
        setExcuteEta(moment(res.eta * 1000).format('LLLL'));
      });
  };

  useEffect(() => {
    loadVotes(4);
  }, [loadVotes]);

  useEffect(() => {
    if (proposalInfo.id) {
      getIsPossibleExcuted();
    }
  }, [proposalInfo]);

  const loadMore = type => {
    if (type === 'for' && agreeVotes.total) {
      promisify(getVoters, {
        id: proposalInfo.id,
        limit: agreeVotes.total,
        filter: 'for'
      })
        .then(res => setAgreeVotes(res.data || {}))
        .catch(err => {
          setAgreeVotes({});
        });
    } else if (againstVotes.total) {
      promisify(getVoters, {
        id: proposalInfo.id,
        limit: againstVotes.total,
        filter: 'against'
      })
        .then(res => setAgainstVotes(res.data || {}))
        .catch(err => {
          setAgainstVotes({});
        });
    }
  };

  const handleUpdateProposal = statusType => {
    const appContract = getVoteContract(instance);
    if (statusType === 'Queue') {
      setIsLoading(true);
      methods
        .send(
          appContract.methods.queue,
          [proposalInfo.id],
          settings.selectedAddress
        )
        .then(() => {
          setIsLoading(false);
          setStatus('success');
          message.success(`Proposal list will update within a few seconds`);
        })
        .catch(() => {
          setIsLoading(false);
          setStatus('failure');
        });
    } else if (statusType === 'Execute') {
      setIsLoading(true);
      methods
        .send(
          appContract.methods.execute,
          [proposalInfo.id],
          settings.selectedAddress
        )
        .then(res => {
          setIsLoading(false);
          setStatus('success');
          message.success(`Proposal list will update within a few seconds`);
        })
        .catch(err => {
          setIsLoading(false);
          setStatus('failure');
        });
    } else if (statusType === 'Cancel') {
      setIsCancelLoading(true);
      methods
        .send(
          appContract.methods.cancel,
          [proposalInfo.id],
          settings.selectedAddress
        )
        .then(() => {
          setIsCancelLoading(false);
          setCancelStatus('success');
          message.success(
            `Current proposal is cancelled successfully. Proposal list will update within a few seconds`
          );
        })
        .catch(() => {
          setIsCancelLoading(false);
          setCancelStatus('failure');
        });
    }
  };

  return (
    <MainLayout title="Overview">
      <VoteOverviewWrapper className="flex">
        <Row>
          <Column xs="12" sm="12">
            <Row>
              <Card>
                <CardWrapper>
                  <Column xs="12" md="12">
                    <ProposalInfo proposalInfo={proposalInfo} />
                  </Column>
                  {/* <Column xs="12" md="4">
                    <ProposalHistory proposalInfo={proposalInfo} />
                    <ProposalUser proposalInfo={proposalInfo} />
                  </Column> */}
                </CardWrapper>
              </Card>
            </Row>
            <Row className="styled-row">
              <Column md="12" lg="4">
                <VoteCard
                  label="For"
                  forNumber={
                    BigNumber(agreeVotes.sumVotes).isNaN()
                      ? '0'
                      : agreeVotes.sumVotes
                  }
                  againstNumber={
                    BigNumber(againstVotes.sumVotes).isNaN()
                      ? '0'
                      : againstVotes.sumVotes
                  }
                  type="agree"
                  addressNumber={
                    BigNumber(agreeVotes.total).isNaN() ? 0 : agreeVotes.total
                  }
                  emptyNumber={
                    4 -
                    (BigNumber(agreeVotes.total).isNaN() ? 0 : agreeVotes.total)
                  }
                  list={
                    agreeVotes.result &&
                    agreeVotes.result.map(v => ({
                      label: v.address,
                      value: v.votes
                    }))
                  }
                  onViewAll={() => loadMore('for')}
                />
              </Column>
              <Column md="12" lg="4">
                <VoteCard
                  label="Against"
                  forNumber={
                    BigNumber(agreeVotes.sumVotes).isNaN()
                      ? '0'
                      : agreeVotes.sumVotes
                  }
                  againstNumber={
                    BigNumber(againstVotes.sumVotes).isNaN()
                      ? '0'
                      : againstVotes.sumVotes
                  }
                  type="against"
                  addressNumber={
                    BigNumber(againstVotes.total).isNaN()
                      ? 0
                      : againstVotes.total
                  }
                  emptyNumber={
                    4 -
                    (BigNumber(againstVotes.total).isNaN()
                      ? 0
                      : againstVotes.total)
                  }
                  list={
                    againstVotes.result &&
                    againstVotes.result.map(v => ({
                      label: v.address,
                      value: v.votes
                    }))
                  }
                  onViewAll={() => loadMore('against')}
                />
              </Column>
              <Column md="12" lg="4">
                <ProposalHistory proposalInfo={proposalInfo} />
              </Column>
            </Row>
            <div className="vote-status-update">
              {proposalInfo.state !== 'Executed' &&
                proposalInfo.state !== 'Defeated' &&
                proposalInfo.state !== 'Canceled' && (
                  <div className="flex align-center just-center update-proposal-status">
                    <Button
                      className="cancel-btn"
                      disabled={
                        isCancelLoading ||
                        proposerVotingWeight >= proposalThreshold ||
                        cancelStatus === 'success'
                      }
                      onClick={() => handleUpdateProposal('Cancel')}
                    >
                      {isCancelLoading && <Icon type="loading" />}{' '}
                      {cancelStatus === 'pending' || cancelStatus === 'failure'
                        ? 'Cancel'
                        : 'Cancelled'}
                    </Button>
                    {proposalInfo.state === 'Succeeded' && (
                      <Button
                        className="queud-btn"
                        disabled={isLoading || status === 'success'}
                        onClick={() => handleUpdateProposal('Queue')}
                      >
                        {isLoading && <Icon type="loading" />}{' '}
                        {status === 'pending' || status === 'failure'
                          ? 'Queue'
                          : 'Queued'}
                      </Button>
                    )}
                    {proposalInfo.state === 'Queued' && (
                      <Button
                        className="execute-btn"
                        disabled={
                          isLoading ||
                          status === 'success' ||
                          !isPossibleExcuted
                        }
                        onClick={() => handleUpdateProposal('Execute')}
                      >
                        {isLoading && <Icon type="loading" />}{' '}
                        {status === 'pending' || status === 'failure'
                          ? 'Execute'
                          : 'Executed'}
                      </Button>
                    )}
                    {proposalInfo.state === 'Queued' && !isPossibleExcuted && (
                      <Tooltip title={`You are able to excute at ${excuteEta}`}>
                        <Icon
                          className="pointer"
                          type="info-circle"
                          theme="filled"
                        />
                      </Tooltip>
                    )}
                  </div>
                )}
              {proposalInfo.state !== 'Executed' &&
                proposalInfo.state !== 'Defeated' &&
                proposalInfo.state !== 'Canceled' &&
                proposerVotingWeight >= proposalThreshold && (
                  <p className="center warning">
                    You can&apos;t cancel the proposal while the proposer voting
                    weight meets proposal threshold
                  </p>
                )}
            </div>
            <Row>
              <Column xs="12">
                <ProposalDetail
                  walletConnected={settings.walletConnected}
                  proposalInfo={proposalInfo}
                />
              </Column>
            </Row>
          </Column>
        </Row>
      </VoteOverviewWrapper>
    </MainLayout>
  );
}

VoteOverview.propTypes = {
  match: PropTypes.object,
  settings: PropTypes.object,
  getProposalById: PropTypes.func.isRequired,
  getVoters: PropTypes.func.isRequired
};

VoteOverview.defaultProps = {
  match: {},
  settings: {}
};

const mapStateToProps = ({ account }) => ({
  settings: account.setting
});

const mapDispatchToProps = dispatch => {
  const { getProposalById, getVoters } = accountActionCreators;

  return bindActionCreators(
    {
      getProposalById,
      getVoters
    },
    dispatch
  );
};

export default compose(
  withRouter,
  connectAccount(mapStateToProps, mapDispatchToProps)
)(VoteOverview);
