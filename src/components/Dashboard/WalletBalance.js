import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { bindActionCreators } from 'redux';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import commaNumber from 'comma-number';
import AnimatedNumber from 'animated-number-react';
import { Tooltip } from 'antd';
import { connectAccount, accountActionCreators } from 'core';
import { getBigNumber, shortenNumberFormatter } from 'utilities/common';
import IconQuestion from 'assets/img/question.png';

const CardWrapper = styled.div`
  width: 100%;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 700px;

  .divider {
    border-bottom: 1px solid #34384c;
  }

  .balance-value {
    display: flex;
    justify-content: center;
    gap: 50px;

    .divider {
      border-left: 1px solid #d1d5db;
      border-bottom: 0px;
      width: unset;
      margin: auto 0;
      height: 80%;
    }

    .balance-area {
      min-width: 120px;
      text-align: center;
    }

    .label {
      font-size: 16px;
      font-weight: 500;
      color: var(--color-text-main);
    }

    .value {
      font-size: 24px;
      font-weight: 600;
      color: var(--color-blue);
      margin-top: 10px;
    }
  }

  .apy-area {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 auto;
    padding: 20px 40px;
    background: var(--color-bg-main);
    border-radius: 6px;
    max-width: 550px;

    .label {
      color: var(--color-text-main);
      font-size: 32px;
      font-weight: 500;
      line-height: 24px;
    }

    .value {
      color: #01ffb4;
      font-size: 36px;
      line-height: 120%;
    }
  }

  @media only screen and (max-width: 1280px) {
    .label {
      font-size: 16px;
    }
    .value {
      font-size: 20px;
    }

    .balance-value {
      gap: 20px;
    }
  }

  @media only screen and (max-width: 768px) {
    padding: 0px;
  }

  @media only screen and (max-width: 600px) {
    .balance-value {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .divider {
        display: none;
      }

      .balance-area {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        min-width: unset;
        padding: 0px 20px;
      }

      .label {
        font-size: 16px;
        font-weight: 500;
        color: var(--color-text-main);
      }

      .value {
        font-size: 24px;
        font-weight: 600;
        color: var(--color-blue);
        margin-top: 0px;
      }
    }
  }

  @media only screen and (max-width: 480px) {
    .apy-area {
      margin: 0 auto;
      padding: 20px 20px;

      .label {
        color: var(--color-text-main);
        font-size: 24px;
        font-weight: 500;
        line-height: 20px;
      }

      .value {
        color: #01ffb4;
        font-size: 28px;
        line-height: 120%;
      }
    }
  }
`;

const SQuestion = styled.img`
  margin: 0px 20px 0px 10px;
`;

const format = commaNumber.bindWith(',', '.');
const abortController = new AbortController();

function WalletBalance({ settings, setSetting }) {
  const [netAPY, setNetAPY] = useState('0');
  const [dailyEarning, setDailyEarning] = useState('0');

  const updateNetAPY = useCallback(async () => {
    let totalSum = new BigNumber(0);
    let totalSupplied = new BigNumber(0);
    let totalBorrowed = new BigNumber(0);
    const { assetList, withSTRK } = settings;
    assetList.forEach(asset => {
      const {
        supplyBalance,
        borrowBalance,
        tokenPrice,
        supplyApy,
        borrowApy,
        strkSupplyApy,
        strkBorrowApy
      } = asset;
      const supplyBalanceUSD = getBigNumber(supplyBalance).times(
        getBigNumber(tokenPrice)
      );
      const borrowBalanceUSD = getBigNumber(borrowBalance).times(
        getBigNumber(tokenPrice)
      );
      totalSupplied = totalSupplied.plus(supplyBalanceUSD);
      totalBorrowed = totalSupplied.plus(borrowBalanceUSD);

      const supplyApyWithSTRK = withSTRK
        ? getBigNumber(supplyApy).plus(getBigNumber(strkSupplyApy))
        : getBigNumber(supplyApy);
      const borrowApyWithSTRK = withSTRK
        ? getBigNumber(strkBorrowApy).minus(getBigNumber(borrowApy))
        : getBigNumber(borrowApy).times(-1);

      // const supplyApyWithSTRK = getBigNumber(supplyApy);
      // const borrowApyWithSTRK = getBigNumber(borrowApy).times(-1);
      totalSum = totalSum.plus(
        supplyBalanceUSD
          .times(supplyApyWithSTRK.div(100))
          .plus(borrowBalanceUSD.times(borrowApyWithSTRK.div(100)))
      );
    });

    if (totalSum.isZero() || totalSum.isNaN()) {
      setNetAPY(0);
    } else if (totalSum.isGreaterThan(0)) {
      setNetAPY(
        totalSupplied.isZero()
          ? 0
          : totalSum
              .div(totalSupplied)
              .times(100)
              .dp(2, 1)
              .toString(10)
      );
    } else {
      setNetAPY(
        totalBorrowed.isZero()
          ? 0
          : totalSum
              .div(totalBorrowed)
              .times(100)
              .dp(2, 1)
              .toString(10)
      );
    }
  }, [settings.assetList, settings.withSTRK]);

  useEffect(() => {
    if (
      settings.selectedAddress &&
      settings.assetList &&
      settings.assetList.length > 0
    ) {
      updateNetAPY();
    }
    return function cleanup() {
      abortController.abort();
    };
  }, [settings.selectedAddress, updateNetAPY]);

  useEffect(() => {
    const dailyBlockCount = 86400 / 12;

    const strkMarket = settings.markets.find(
      ele => ele.underlyingSymbol === 'STRK'
    );
    const strkPrice = strkMarket?.tokenPrice || new BigNumber(0);

    let tempDailyEarning = new BigNumber(0);
    const { assetList, markets } = settings;
    assetList.forEach(asset => {
      const market = markets.find(
        ele => ele.address === asset?.stokenAddress?.toString().toLowerCase()
      );

      if (market) {
        let supplyDailyEarning = new BigNumber(0);
        if (new BigNumber(market.totalSupplyUsd).gt(0))
          supplyDailyEarning = new BigNumber(asset.supplyBalance)
            .times(asset.tokenPrice)
            .div(market.totalSupplyUsd)
            .times(market.strikeSupplySpeeds)
            .div(1e18)
            .times(dailyBlockCount)
            .times(strkPrice);

        let borrowDailyEarning = new BigNumber(0);
        if (new BigNumber(market.totalBorrowsUsd).gt(0))
          borrowDailyEarning = new BigNumber(asset.borrowBalance)
            .times(asset.tokenPrice)
            .div(market.totalBorrowsUsd)
            .times(market.strikeBorrowSpeeds)
            .div(1e18)
            .times(dailyBlockCount)
            .times(strkPrice);

        tempDailyEarning = tempDailyEarning
          .plus(supplyDailyEarning)
          .plus(borrowDailyEarning);
      }
    });
    setDailyEarning(tempDailyEarning.toString(10));
  }, [settings.assetList, settings.markets]);

  const formatValue = value => {
    return `$${format(
      getBigNumber(value)
        .dp(2, 1)
        .toString(10)
    )}`;
  };

  return (
    <CardWrapper>
      <div className="apy-area">
        <div className="flex align-center">
          <p className="pointer label">
            Net APY&nbsp;
            <Tooltip
              placement="bottom"
              title={
                <span>
                  Percentage of your total supply balance received as yearly
                  interests
                </span>
              }
            >
              <SQuestion src={IconQuestion} />
            </Tooltip>
          </p>
        </div>
        <p className="value">{shortenNumberFormatter(netAPY)}%</p>
      </div>
      <div className="divider" />
      <div className="balance-value">
        <div className="balance-area">
          <div className="label">Daily Earnings</div>
          <div className="value">
            <AnimatedNumber
              value={dailyEarning}
              formatValue={formatValue}
              duration={0}
            />
          </div>
        </div>

        <div className="divider" />

        <div className="balance-area">
          <div className="label">Supply Balance</div>
          <div className="value">
            <AnimatedNumber
              value={getBigNumber(settings.totalSupplyBalance)
                .dp(2, 1)
                .toString(10)}
              formatValue={formatValue}
              duration={0}
            />
          </div>
        </div>

        <div className="divider" />

        <div className="balance-area">
          <div className="label">Borrow Balance</div>
          <div className="value">
            <AnimatedNumber
              value={getBigNumber(settings.totalBorrowBalance)
                .dp(2, 1)
                .toString(10)}
              formatValue={formatValue}
              duration={0}
            />
          </div>
        </div>
      </div>
    </CardWrapper>
  );
}

WalletBalance.propTypes = {
  settings: PropTypes.object,
  setSetting: PropTypes.func.isRequired
};

WalletBalance.defaultProps = {
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
  WalletBalance
);
