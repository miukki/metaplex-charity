import React from 'react'
import {useEffect} from 'react'
import {Button} from 'antd'

const BuySell = () => {
  return <img style={{width: `80%`, height: `auto`}} src={'/buy-sell.svg'} />
}

export const Banner = (props: {
  src: string
  useBannerBg: boolean
  headingText: string
  subHeadingText: string
  actionComponent?: JSX.Element
  children?: React.ReactNode
}) => {
  useEffect(() => {
    const mainBg = document.getElementById('main-bg')
    const gradient = document.getElementById('bg-gradient')
    if (mainBg && props.useBannerBg) {
      mainBg.style.backgroundImage = `url(${props.src})`
      mainBg.style.display = 'inline-block'
      if (gradient) {
        gradient.style.display = 'inline-block'
      }
    }

    return () => {
      const mainBg = document.getElementById('main-bg')
      const gradient = document.getElementById('bg-gradient')
      if (mainBg && props.useBannerBg) {
        mainBg.style.backgroundImage = ''
        mainBg.style.display = 'none'
      }
      if (gradient) gradient.style.display = 'none'
    }
  }, [props.src, props.useBannerBg])

  return (
    <>
      <div id="mobile-banner">
        <img className="banner-img" src={props.src} />
        <div className="banner-content">
          {/* <div id={'main-heading'}>{props.headingText}</div> */}
          <BuySell />
          <div id={'sub-heading'}>{props.subHeadingText}</div>
          {/* {props.actionComponent} */}
          <div>
            {/* <Button className={`secondary-btn`} onClick={() => {}}>
              {`VIEW #NoWarArt `}
            </Button> */}
            <Button
                className={`secondary-btn`}
                onClick={() => {
                  window.location.href = 'https://form.typeform.com/to/g5JS1b08'
                }}
              >
                {`SUBMIT YOUR ARTWORK`}
              </Button>

          </div>
        </div>
      </div>
      <div
        id={'current-banner'}
        style={{background: `url(${props.src}) 400px 0px/auto 100% no-repeat`}}
      >
        <span id={'gradient-banner'}></span>
        <div id="banner-inner">
          <div id={'message-container'} style={{backgroundColor: `#090a09`}}>
            <BuySell />
            {/* <div id={'main-heading'}>{props.headingText}</div> */}
            <div id={'sub-heading'}>{props.subHeadingText}</div>
            {/* {props.actionComponent} */}
            <div>
              {/* <Button className={`secondary-btn`} onClick={() => {}}>
                {`VIEW #NoWarArt`}
              </Button> */}
              <Button
                className={`secondary-btn`}
                onClick={() => {
                  window.location.href = 'https://form.typeform.com/to/g5JS1b08'
                }}
              >
                {`SUBMIT YOUR ARTWORK`}
              </Button>
            </div>
          </div>
          {props.children}
          <div className="powered-by">
            <span>
              POWERED BY <b>YOME</b>
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
