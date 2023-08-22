import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ethers } from 'ethers';
import { message } from 'antd';
import Button from '@material-ui/core/Button';
import * as constants from 'utilities/constants';
import ConnectModal from 'components/Basic/ConnectModal';
import AccountModal from 'components/Basic/AccountModal';
import { connectAccount, accountActionCreators } from 'core';
import InjectWalletClass from 'utilities/InjectWallet';

const StyledConnectButton = styled.div`
  display: flex;
  justify-content: center;
  margin-left: 40px;

  @media only screen and (max-width: 768px) {
    width: 100%;
    margin: 20px 0 0;
  }

  .connect-btn {
    width: 150px;
    height: 32px;
    background: linear-gradient(
      242deg,
      #246cf9 0%,
      #1e68f6 0.01%,
      #0047d0 100%,
      #0047d0 100%
    );

    @media only screen and (max-width: 768px) {
      width: 100px;
    }

    .MuiButton-label {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--color-white);
      text-transform: capitalize;
    }
  }
`;

let metamask = null;
let bitkeep = null;
let trustwallet = null;
let accounts = [];
const metamaskWatcher = null;
const bitkeepWatcher = null;
const trustwalletWatcher = null;

const abortController = new AbortController();

function ConnectButton({ history, settings, setSetting, getGovernanceStrike }) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isOpenAccountModal, setIsOpenAccountModal] = useState(false);
  const [awaiting, setAwaiting] = useState('');
  const [metamaskError, setMetamaskError] = useState('');
  const [bitkeepError, setBitkeepError] = useState('');
  const [trustwalletError, setTrustwalletError] = useState('');
  const [web3, setWeb3] = useState(null);

  const checkNetwork = () => {
    const netId = window.ethereum.networkVersion
      ? +window.ethereum.networkVersion
      : +window.ethereum.chainId;
    setSetting({
      accountLoading: true
    });
    if (netId) {
      if (netId === 1 || netId === 5) {
        if (netId === 5 && process.env.REACT_APP_ENV === 'prod') {
          message.error(
            'You are currently visiting the Goerli Test Network for Strike Finance. Please change your metamask to access the Ethereum Mainnet.'
          );
        } else if (netId === 1 && process.env.REACT_APP_ENV === 'dev') {
          message.error(
            'You are currently visiting the Main Network for Strike Finance. Please change your metamask to access the Goerli Test Network.'
          );
        } else {
          setSetting({
            accountLoading: false
          });
        }
      } else {
        message.error(
          'You are currently connected to another network. Please connect to Ethereum Network'
        );
      }
    }
  };

  const withTimeoutRejection = async (promise, timeout) => {
    const sleep = new Promise((resolve, reject) =>
      setTimeout(() => reject(new Error(constants.TIMEOUT)), timeout)
    );
    return Promise.race([promise, sleep]);
  };

  const handleMetamaskWatch = useCallback(async () => {
    if (window.ethereum) {
      const accs = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accs[0]) {
        accounts = [];
        clearTimeout(metamaskWatcher);
        setSetting({ selectedAddress: null });
      }
      if (!accounts.length) {
        setAwaiting('metamask');
      }
    }
    if (metamaskWatcher) {
      clearTimeout(metamaskWatcher);
    }

    let tempWeb3 = null;
    let tempAccounts = [];
    let tempENSName = null;
    let tempENSAvatar = null;
    let tempError = metamaskError;
    let latestBlockNumber = 0;
    try {
      const isLocked =
        metamaskError && metamaskError.message === constants.LOCKED;
      if (!metamask || isLocked) {
        metamask = await withTimeoutRejection(
          InjectWalletClass.initialize(undefined), // if option is existed, add it
          20 * 1000 // timeout
        );
      }
      tempWeb3 = await metamask.getWeb3();
      const currentChainId = await metamask.getChainId();
      const chainId = process.env.REACT_APP_ENV === 'prod' ? '0x1' : '0x5';
      if (currentChainId !== Number(chainId))
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }]
        });
      tempAccounts = await metamask.getAccounts();
      // Lookup ENS name and avatar when possible
      const ethersProvider = new ethers.providers.Web3Provider(
        tempWeb3.currentProvider
      );
      tempENSName = await ethersProvider.lookupAddress(tempAccounts[0]);
      tempENSAvatar = tempENSName
        ? await ethersProvider.getAvatar(tempENSName)
        : null;
      latestBlockNumber = await metamask.getLatestBlockNumber();
      if (latestBlockNumber) {
        await setSetting({ latestBlockNumber });
      }
      tempError = null;
    } catch (err) {
      tempError = err;
      accounts = [];
      await setSetting({ selectedAddress: null });
    }
    await setSetting({
      selectedAddress: tempAccounts[0],
      selectedENSName: tempENSName,
      selectedENSAvatar: tempENSAvatar,
      isConnected: 'metamask'
    });
    accounts = tempAccounts;
    setWeb3(tempWeb3);
    setMetamaskError(tempError);
    setAwaiting('');
    localStorage.setItem('walletConnected', 'metamask');
  }, [metamaskError, web3]);

  const handleBitkeepWatch = useCallback(async () => {
    if (window.bitkeep && window.bitkeep.ethereum) {
      const accs = await window.bitkeep.ethereum.request({
        method: 'eth_accounts'
      });
      if (!accs[0]) {
        accounts = [];
        clearTimeout(bitkeepWatcher);
        setSetting({ selectedAddress: null });
      }
      if (!accounts.length) {
        setAwaiting('bitkeep');
      }
    }
    if (bitkeepWatcher) {
      clearTimeout(bitkeepWatcher);
    }

    let tempWeb3 = null;
    let tempAccounts = [];
    let tempENSName = null;
    let tempENSAvatar = null;
    let tempError = bitkeepError;
    let latestBlockNumber = 0;
    try {
      const isLocked =
        bitkeepError && bitkeepError.message === constants.LOCKED;
      if (!bitkeep || isLocked) {
        bitkeep = await withTimeoutRejection(
          InjectWalletClass.initialize({ walletType: 'bitkeep' }), // if option is existed, add it
          20 * 1000 // timeout
        );
      }
      tempWeb3 = await bitkeep.getWeb3();
      const currentChainId = await bitkeep.getChainId();
      const chainId = process.env.REACT_APP_ENV === 'prod' ? '0x1' : '0x5';
      if (currentChainId !== Number(chainId))
        await window.bitkeep.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }]
        });
      tempAccounts = await bitkeep.getAccounts();
      // Lookup ENS name and avatar when possible
      const ethersProvider = new ethers.providers.Web3Provider(
        tempWeb3.currentProvider
      );
      tempENSName = await ethersProvider.lookupAddress(tempAccounts[0]);
      tempENSAvatar = tempENSName
        ? await ethersProvider.getAvatar(tempENSName)
        : null;
      latestBlockNumber = await bitkeep.getLatestBlockNumber();
      if (latestBlockNumber) {
        await setSetting({ latestBlockNumber });
      }
      tempError = null;
    } catch (err) {
      tempError = err;
      accounts = [];
      await setSetting({ selectedAddress: null });
    }
    await setSetting({
      selectedAddress: tempAccounts[0],
      selectedENSName: tempENSName,
      selectedENSAvatar: tempENSAvatar,
      isConnected: 'bitkeep'
    });
    accounts = tempAccounts;
    setWeb3(tempWeb3);
    setBitkeepError(tempError);
    setAwaiting('');
    localStorage.setItem('walletConnected', 'bitkeep');
  }, [bitkeepError, web3]);

  const handleTrustWalletWatch = useCallback(async () => {
    if (window.trustwallet) {
      const accs = await window.trustwallet.request({
        method: 'eth_accounts'
      });
      if (!accs[0]) {
        accounts = [];
        clearTimeout(trustwalletWatcher);
        setSetting({ selectedAddress: null });
      }
      if (!accounts.length) {
        setAwaiting('trustwallet');
      }
    }
    if (trustwalletWatcher) {
      clearTimeout(trustwalletWatcher);
    }

    let tempWeb3 = null;
    let tempAccounts = [];
    let tempENSName = null;
    let tempENSAvatar = null;
    let tempError = trustwalletError;
    let latestBlockNumber = 0;
    try {
      const isLocked =
        trustwalletError && trustwalletError.message === constants.LOCKED;
      if (!trustwallet || isLocked) {
        trustwallet = await withTimeoutRejection(
          InjectWalletClass.initialize({ walletType: 'trustwallet' }), // if option is existed, add it
          20 * 1000 // timeout
        );
      }
      tempWeb3 = await trustwallet.getWeb3();
      const currentChainId = await trustwallet.getChainId();
      const chainId = process.env.REACT_APP_ENV === 'prod' ? '0x1' : '0x5';
      if (currentChainId !== Number(chainId))
        await window.trustwallet.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }]
        });
      tempAccounts = await trustwallet.getAccounts();
      // Lookup ENS name and avatar when possible
      const ethersProvider = new ethers.providers.Web3Provider(
        tempWeb3.currentProvider
      );
      tempENSName = await ethersProvider.lookupAddress(tempAccounts[0]);
      tempENSAvatar = tempENSName
        ? await ethersProvider.getAvatar(tempENSName)
        : null;
      latestBlockNumber = await trustwallet.getLatestBlockNumber();
      if (latestBlockNumber) {
        await setSetting({ latestBlockNumber });
      }
      tempError = null;
    } catch (err) {
      tempError = err;
      accounts = [];
      await setSetting({ selectedAddress: null });
    }
    await setSetting({
      selectedAddress: tempAccounts[0],
      selectedENSName: tempENSName,
      selectedENSAvatar: tempENSAvatar,
      isConnected: 'trustwallet'
    });
    accounts = tempAccounts;
    setWeb3(tempWeb3);
    setTrustwalletError(tempError);
    setAwaiting('');
    localStorage.setItem('walletConnected', 'trustwallet');
  }, [trustwallet, web3]);

  const handleMetaMask = () => {
    setMetamaskError(window.ethereum ? '' : new Error(constants.NOT_INSTALLED));
    handleMetamaskWatch();
  };

  const handleBitKeep = () => {
    setBitkeepError(
      window.bitkeep && window.bitkeep.ethereum
        ? ''
        : new Error(constants.NOT_INSTALLED)
    );
    handleBitkeepWatch();
  };

  const handleTrustWallet = () => {
    setTrustwalletError(
      window.trustwallet ? '' : new Error(constants.NOT_INSTALLED)
    );
    handleTrustWalletWatch();
  };

  useEffect(() => {
    if (accounts.length !== 0) {
      setIsOpenModal(false);
    }
    return function cleanup() {
      abortController.abort();
    };
  }, [accounts]);

  useEffect(() => {
    if (settings.isConnected === 'metamask') {
      handleMetamaskWatch();
    } else if (settings.isConnected === 'bitkeep') {
      handleBitkeepWatch();
    } else if (settings.isConnected === 'trustwallet') {
      handleTrustWalletWatch();
    }
    return function cleanup() {
      abortController.abort();
    };
  }, [history]);

  useEffect(() => {
    if (window.ethereum) {
      window.addEventListener('load', event => {
        checkNetwork();
      });
    }
  }, [window.ethereum]);

  const handleDisconnect = () => {
    localStorage.clear();
    setSetting({
      selectedAddress: null,
      isConnected: ''
    });
  };

  return (
    <>
      <StyledConnectButton>
        {settings.selectedAddress ? (
          <Button
            className="connect-btn"
            onClick={() => {
              setIsOpenAccountModal(true);
            }}
          >
            {`${settings.selectedAddress.substr(
              0,
              4
            )}...${settings.selectedAddress.substr(
              settings.selectedAddress.length - 4,
              4
            )}`}
          </Button>
        ) : (
          <Button
            className="connect-btn"
            onClick={() => {
              setMetamaskError(null);
              setBitkeepError(null);
              setTrustwalletError(null);
              setIsOpenModal(true);
            }}
          >
            Connect
          </Button>
        )}
      </StyledConnectButton>

      <ConnectModal
        visible={isOpenModal}
        web3={web3}
        metamaskError={metamaskError}
        bitkeepError={bitkeepError}
        trustwalletError={trustwalletError}
        awaiting={awaiting}
        onCancel={() => setIsOpenModal(false)}
        onConnectMetaMask={handleMetaMask}
        onConnectBitKeep={handleBitKeep}
        onConnectTrustWallet={handleTrustWallet}
        checkNetwork={checkNetwork}
      />
      <AccountModal
        visible={isOpenAccountModal}
        onCancel={() => setIsOpenAccountModal(false)}
        onDisconnect={() => handleDisconnect()}
      />
    </>
  );
}

ConnectButton.propTypes = {
  history: PropTypes.object,
  settings: PropTypes.object,
  setSetting: PropTypes.func.isRequired,
  getGovernanceStrike: PropTypes.func.isRequired
};

ConnectButton.defaultProps = {
  settings: {},
  history: {}
};

const mapStateToProps = ({ account }) => ({
  settings: account.setting
});

const mapDispatchToProps = dispatch => {
  const { setSetting, getGovernanceStrike } = accountActionCreators;

  return bindActionCreators(
    {
      setSetting,
      getGovernanceStrike
    },
    dispatch
  );
};

export default compose(
  withRouter,
  connectAccount(mapStateToProps, mapDispatchToProps)
)(ConnectButton);