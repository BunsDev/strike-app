import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { Icon, Progress } from 'antd';
import Button from '@material-ui/core/Button';
import NumberFormat from 'react-number-format';
import { bindActionCreators } from 'redux';
import BigNumber from 'bignumber.js';
import commaNumber from 'comma-number';
import { connectAccount, accountActionCreators } from 'core';
import { getSbepContract, methods } from 'utilities/ContractService';
import { getBigNumber, shortenNumberFormatter } from 'utilities/common';
import { SectionWrapper } from 'components/Basic/Supply/SupplySection';
import ConnectButton from 'containers/Layout/ConnectButton';
import IconQuestion from 'assets/img/question.png';
import arrowRightImg from 'assets/img/arrow-right.png';
import coinImg from 'assets/img/strike_32.png';
import { useInstance } from 'hooks/useContract';

const format = commaNumber.bindWith(',', '.');
const abortController = new AbortController();

function BorrowSection({ asset, settings, setSetting, hideModal }) {
  const instance = useInstance(settings.walletConnected);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState(new BigNumber(0));
  const [borrowBalance, setBorrowBalance] = useState(new BigNumber(0));
  const [borrowPercent, setBorrowPercent] = useState(new BigNumber(0));
  const [newBorrowBalance, setNewBorrowBalance] = useState(new BigNumber(0));
  const [newBorrowPercent, setNewBorrowPercent] = useState(new BigNumber(0));

  const updateInfo = useCallback(() => {
    const totalBorrowBalance = getBigNumber(settings.totalBorrowBalance);
    const totalBorrowLimit = getBigNumber(settings.totalBorrowLimit);
    const tokenPrice = getBigNumber(asset.tokenPrice);
    if (amount.isZero() || amount.isNaN()) {
      setBorrowBalance(totalBorrowBalance);
      if (totalBorrowLimit.isZero()) {
        setBorrowPercent(new BigNumber(0));
        setNewBorrowPercent(new BigNumber(0));
      } else {
        setBorrowPercent(totalBorrowBalance.div(totalBorrowLimit).times(100));
        setNewBorrowPercent(
          totalBorrowBalance.div(totalBorrowLimit).times(100)
        );
      }
    } else {
      const temp = totalBorrowBalance.plus(amount.times(tokenPrice));
      setBorrowBalance(totalBorrowBalance);
      setNewBorrowBalance(temp);
      if (totalBorrowLimit.isZero()) {
        setBorrowPercent(new BigNumber(0));
        setNewBorrowPercent(new BigNumber(0));
      } else {
        setBorrowPercent(totalBorrowBalance.div(totalBorrowLimit).times(100));
        setNewBorrowPercent(temp.div(totalBorrowLimit).times(100));
      }
    }
  }, [settings.selectedAddress, amount, asset]);

  /**
   * Get Allowed amount
   */
  useEffect(() => {
    if (asset.stokenAddress && settings.selectedAddress) {
      updateInfo();
    }
    return function cleanup() {
      abortController.abort();
    };
  }, [settings.selectedAddress, updateInfo, asset]);

  /**
   * Borrow
   */
  const handleBorrow = () => {
    const appContract = getSbepContract(instance, asset.id);
    if (asset && settings.selectedAddress) {
      setIsLoading(true);
      setSetting({
        pendingInfo: {
          type: 'Borrow',
          status: true,
          amount: amount.dp(8, 1).toString(10),
          symbol: asset.symbol
        }
      });
      methods
        .send(
          appContract.methods.borrow,
          [
            amount
              .times(new BigNumber(10).pow(settings.decimals[asset.id].token))
              .integerValue()
              .toString(10)
          ],
          settings.selectedAddress
        )
        .then(res => {
          setAmount(new BigNumber(0));
          setIsLoading(false);
          setSetting({
            pendingInfo: {
              type: '',
              status: false,
              amount: 0,
              symbol: ''
            }
          });
          hideModal();
        })
        .catch(() => {
          setIsLoading(false);
          setSetting({
            pendingInfo: {
              type: '',
              status: false,
              amount: 0,
              symbol: ''
            }
          });
        });
    }
  };
  /**
   * Max amount
   */
  const handleMaxAmount = () => {
    const totalBorrowBalance = getBigNumber(settings.totalBorrowBalance);
    const totalBorrowLimit = getBigNumber(settings.totalBorrowLimit);
    const tokenPrice = getBigNumber(asset.tokenPrice);
    const safeMax = BigNumber.maximum(
      totalBorrowLimit
        .times(80)
        .div(100)
        .minus(totalBorrowBalance)
        .dp(settings.decimals[asset.id].token, 0),
      new BigNumber(0)
    );

    if (asset.borrowCaps.isGreaterThan(0)) {
      if (asset.borrowCaps.isEqualTo(1e-18)) setAmount(new BigNumber(0));
      else
        setAmount(
          BigNumber.minimum(safeMax, asset.liquidity, asset.borrowCaps).div(
            tokenPrice
          )
        );
    } else
      setAmount(BigNumber.minimum(safeMax, asset.liquidity).div(tokenPrice));
  };

  return (
    <SectionWrapper>
      {!settings.selectedAddress ? (
        <>
          <div className="alert">
            <img src={IconQuestion} alt="info" />
            <span>Please connect your wallet to borrow</span>
          </div>
          <ConnectButton />
        </>
      ) : (
        <>
          <div className="header">
            <div className="right-header">
              {/* <div className="input-label">Amount</div> */}
              <div className="input-section">
                <NumberFormat
                  value={amount.isZero() ? '0' : amount.toString(10)}
                  onValueChange={values => {
                    const { value } = values;
                    setAmount(new BigNumber(value));
                  }}
                  decimalScale={settings.decimals[asset.id].token}
                  isAllowed={({ value }) => {
                    const totalBorrowBalance = getBigNumber(
                      settings.totalBorrowBalance
                    );
                    const totalBorrowLimit = getBigNumber(
                      settings.totalBorrowLimit
                    );
                    return new BigNumber(value || 0)
                      .plus(totalBorrowBalance)
                      .isLessThanOrEqualTo(totalBorrowLimit);
                  }}
                  thousandSeparator
                  allowNegative={false}
                  placeholder="0"
                />
                <span className="pointer max" onClick={() => handleMaxAmount()}>
                  SAFE MAX
                </span>
              </div>
            </div>
          </div>
          <div className="wallet-section">
            <div className="description">
              <span className="label">Protocol Balance</span>
              <span className="value">
                {asset.borrowBalance &&
                  format(
                    getBigNumber(asset.borrowBalance)
                      .dp(2, 1)
                      .toString(10)
                  )}{' '}
                {asset.symbol}
              </span>
            </div>
          </div>
          <div className="body">
            <div className="left-content">
              <div className="description">
                <div className="flex align-center">
                  <img src={asset.img} alt="asset" />
                  <span className="label">Borrow APY</span>
                </div>
                <span className="value green">
                  {asset.borrowApy &&
                    shortenNumberFormatter(
                      getBigNumber(asset.borrowApy)
                        .dp(2, 1)
                        .toString(10)
                    )}
                  %
                </span>
              </div>
              <div className="description">
                <div className="flex align-center">
                  <img src={coinImg} alt="asset" />
                  <span className="label">Interest APY</span>
                </div>
                <span className="value">
                  {shortenNumberFormatter(
                    getBigNumber(asset.strkBorrowApy)
                      .dp(2, 1)
                      .toString(10)
                  )}
                  %
                </span>
              </div>
            </div>
            <div className="right-content">
              <div className="description">
                <span className="label">Borrow Balance</span>
                {amount.isZero() || amount.isNaN() ? (
                  <span className="value">
                    ${format(borrowBalance.dp(2, 1).toString(10))}
                  </span>
                ) : (
                  <div className="flex align-center just-between">
                    <span className="value">
                      ${format(borrowBalance.dp(2, 1).toString(10))}
                    </span>
                    <img
                      className="arrow-right-img"
                      src={arrowRightImg}
                      alt="arrow"
                    />
                    <span className="value">
                      ${format(newBorrowBalance.dp(2, 1).toString(10))}
                    </span>
                  </div>
                )}
              </div>
              <div className="description">
                <span className="label">Borrow Limit Used</span>
                {amount.isZero() || amount.isNaN() ? (
                  <span className="value">
                    {borrowPercent.dp(2, 1).toString(10)}%
                  </span>
                ) : (
                  <div className="flex align-center just-between">
                    <span className="value">
                      {borrowPercent.dp(2, 1).toString(10)}%
                    </span>
                    <img
                      className="arrow-right-img"
                      src={arrowRightImg}
                      alt="arrow"
                    />
                    <span className="value">
                      {newBorrowPercent.dp(2, 1).toString(10)}%
                    </span>
                  </div>
                )}
              </div>
              {/* <Progress
            percent={newBorrowPercent.toString(10)}
            strokeColor="#d99d43"
            strokeWidth={7}
            showInfo={false}
          /> */}
            </div>
          </div>
          <div className="footer">
            <div className="button-section">
              <Button
                className="action-button"
                disabled={
                  isLoading ||
                  amount.isZero() ||
                  amount.isNaN() ||
                  amount.isGreaterThan(asset.liquidity.div(asset.tokenPrice)) ||
                  newBorrowPercent.isGreaterThan(100) ||
                  asset.borrowCaps.isEqualTo(1)
                }
                onClick={handleBorrow}
              >
                {isLoading && <Icon type="loading" />} Borrow
              </Button>
            </div>
          </div>
        </>
      )}
    </SectionWrapper>
  );
}

BorrowSection.propTypes = {
  asset: PropTypes.object,
  settings: PropTypes.object,
  setSetting: PropTypes.func.isRequired,
  hideModal: PropTypes.func.isRequired
};

BorrowSection.defaultProps = {
  asset: {},
  settings: {}
};

const mapStateToProps = ({ account }) => ({
  settings: account.setting
});

const mapDispatchToProps = dispatch => {
  const { setSetting } = accountActionCreators;

  return bindActionCreators(
    {
      setSetting
    },
    dispatch
  );
};

export default compose(connectAccount(mapStateToProps, mapDispatchToProps))(
  BorrowSection
);
